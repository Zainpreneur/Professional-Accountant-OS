import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JournalsService } from "../accounting/journals/journals.service";
import { AuditService } from "../audit/audit.service";
import type { CreatePayrollRunDto, PostPayrollRunDto } from "./dto/payroll.dto";
import type { RequestUser } from "../common/types";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// Payroll (SRS 22). A run snapshots each employee's pay onto a Payslip at
// creation time (so later base-salary changes never retroactively alter a
// past run); posting is a single journal covering every payslip in the run:
// Debit Salaries & Wages for total gross, Credit Salaries Payable for total
// net, Credit a deductions-payable account for whatever was withheld.
// Jurisdiction-specific withholdings (GOSI, WHT, ...) get real dedicated
// accounts once Phase 3's regulatory rules engine lands - for now
// `deductions` is a single lumped amount.
@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journals: JournalsService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.payrollRun.findMany({
      where: { clientId },
      include: { payslips: { include: { employee: true } } },
      orderBy: { payDate: "desc" },
    });
  }

  async get(clientId: string, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { payslips: { include: { employee: true } }, journal: { include: { lines: true } } },
    });
    if (!run || run.clientId !== clientId) throw new NotFoundException("Payroll run not found");
    return run;
  }

  async create(actor: RequestUser, clientId: string, dto: CreatePayrollRunDto) {
    const existing = await this.prisma.payrollRun.findUnique({
      where: { clientId_periodLabel: { clientId, periodLabel: dto.periodLabel } },
    });
    if (existing) throw new BadRequestException(`Payroll period ${dto.periodLabel} already exists`);

    const employees = dto.lines
      ? await this.prisma.employee.findMany({ where: { id: { in: dto.lines.map((l) => l.employeeId) }, clientId } })
      : await this.prisma.employee.findMany({ where: { clientId, status: "ACTIVE" } });

    if (employees.length === 0) throw new BadRequestException("No employees to include in this payroll run");
    if (dto.lines && employees.length !== dto.lines.length) {
      throw new BadRequestException("One or more employeeIds not found for this client");
    }

    const overrides = new Map((dto.lines ?? []).map((l) => [l.employeeId, l]));

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    const payslips = employees.map((emp) => {
      const override = overrides.get(emp.id);
      const basicSalary = Number(emp.baseSalary);
      const allowances = override?.allowances ?? 0;
      const deductions = override?.deductions ?? 0;
      const grossPay = round2(basicSalary + allowances);
      const netPay = round2(grossPay - deductions);
      totalGross = round2(totalGross + grossPay);
      totalDeductions = round2(totalDeductions + deductions);
      totalNet = round2(totalNet + netPay);
      return { employeeId: emp.id, basicSalary, allowances, deductions, grossPay, netPay };
    });

    const run = await this.prisma.payrollRun.create({
      data: {
        clientId,
        periodLabel: dto.periodLabel,
        payDate: new Date(dto.payDate),
        status: "DRAFT",
        totalGross,
        totalDeductions,
        totalNet,
        payslips: { create: payslips },
      },
      include: { payslips: true },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "PAYROLL_RUN_CREATED",
      entityType: "PayrollRun",
      entityId: run.id,
      after: { periodLabel: run.periodLabel, totalGross, totalNet, employeeCount: payslips.length },
    });
    return run;
  }

  async post(actor: RequestUser, clientId: string, runId: string, dto: PostPayrollRunDto) {
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.findUnique({ where: { id: runId } });
      if (!run || run.clientId !== clientId) throw new NotFoundException("Payroll run not found");
      if (run.status !== "DRAFT") throw new BadRequestException("Only a draft payroll run can be posted");

      const totalDeductions = Number(run.totalDeductions);
      if (totalDeductions > 0.005 && !dto.deductionsPayableAccountId) {
        throw new BadRequestException("deductionsPayableAccountId is required when this run has deductions");
      }

      const lines = [
        { accountId: dto.salariesExpenseAccountId, debit: Number(run.totalGross), credit: 0, description: `Payroll ${run.periodLabel}` },
        { accountId: dto.salariesPayableAccountId, debit: 0, credit: Number(run.totalNet), description: `Payroll ${run.periodLabel}` },
      ];
      if (totalDeductions > 0.005) {
        lines.push({
          accountId: dto.deductionsPayableAccountId!,
          debit: 0,
          credit: totalDeductions,
          description: `Payroll deductions ${run.periodLabel}`,
        });
      }

      const journal = await this.journals.postSystemJournal(tx, {
        clientId,
        date: run.payDate,
        description: `Payroll run ${run.periodLabel}`,
        source: "SYSTEM",
        sourceType: "PayrollRun",
        sourceId: run.id,
        lines,
        actorId: actor.id,
      });

      const posted = await tx.payrollRun.update({ where: { id: runId }, data: { status: "POSTED", journalId: journal.id } });

      await this.audit.log(
        {
          firmId: actor.firmId,
          clientId,
          userId: actor.id,
          action: "PAYROLL_RUN_POSTED",
          entityType: "PayrollRun",
          entityId: runId,
          after: { journalId: journal.id },
        },
        tx,
      );

      return posted;
    });
  }
}
