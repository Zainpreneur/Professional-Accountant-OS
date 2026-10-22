import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
  baseSalary: string;
  status: string;
}

export default function EmployeesPage() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeeCode: "",
    firstName: "",
    lastName: "",
    email: "",
    jobTitle: "",
    hireDate: new Date().toISOString().slice(0, 10),
    baseSalary: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setEmployees(await api<Employee[]>(`/clients/${clientId}/employees`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load employees");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api(`/clients/${clientId}/employees`, {
        method: "POST",
        body: { ...form, baseSalary: parseFloat(form.baseSalary) || 0 },
      });
      setForm({ employeeCode: "", firstName: "", lastName: "", email: "", jobTitle: "", hireDate: new Date().toISOString().slice(0, 10), baseSalary: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create employee");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Employees</h2>
        <button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ New employee"}</button>
      </div>

      {showForm && (
        <form onSubmit={onCreate} className="card row" style={{ alignItems: "flex-end" }}>
          <div className="stack">
            <label>Code</label>
            <input value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>First name</label>
            <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Last name</label>
            <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Job title</label>
            <input value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} />
          </div>
          <div className="stack">
            <label>Hire date</label>
            <input type="date" value={form.hireDate} onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))} required />
          </div>
          <div className="stack">
            <label>Base salary</label>
            <input type="number" step="0.01" style={{ width: 110 }} value={form.baseSalary} onChange={(e) => setForm((f) => ({ ...f, baseSalary: e.target.value }))} required />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Add"}
          </button>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card">
        {employees === null ? (
          <p className="muted">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="muted">No employees yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Job title</th>
                <th>Base salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.employeeCode}</td>
                  <td>{e.firstName} {e.lastName}</td>
                  <td>{e.jobTitle ?? "-"}</td>
                  <td>{Number(e.baseSalary).toFixed(2)}</td>
                  <td>
                    <span className={`badge ${e.status.toLowerCase()}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
