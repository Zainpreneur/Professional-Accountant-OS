import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreateEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";
import type { RequestUser } from "../common/types";

// HR master data, shared by Expense Management (claimant) and Payroll
// (payslip recipient).
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(clientId: string) {
    return this.prisma.employee.findMany({ where: { clientId }, orderBy: { firstName: "asc" } });
  }

  async create(actor: RequestUser, clientId: string, dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { clientId_employeeCode: { clientId, employeeCode: dto.employeeCode } },
    });
    if (existing) throw new BadRequestException(`Employee code ${dto.employeeCode} already exists`);

    const employee = await this.prisma.employee.create({
      data: {
        clientId,
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        jobTitle: dto.jobTitle,
        hireDate: new Date(dto.hireDate),
        baseSalary: dto.baseSalary ?? 0,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: employee.id,
      after: employee,
    });
    return employee;
  }

  async update(actor: RequestUser, clientId: string, employeeId: string, dto: UpdateEmployeeDto) {
    const before = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!before || before.clientId !== clientId) throw new NotFoundException("Employee not found");

    const employee = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        jobTitle: dto.jobTitle,
        baseSalary: dto.baseSalary,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        status: dto.terminationDate ? "TERMINATED" : undefined,
      },
    });

    await this.audit.log({
      firmId: actor.firmId,
      clientId,
      userId: actor.id,
      action: "EMPLOYEE_UPDATED",
      entityType: "Employee",
      entityId: employeeId,
      before,
      after: employee,
    });
    return employee;
  }
}
