"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}
interface Product {
  id: string;
  sku: string;
  name: string;
  active: boolean;
}
interface Warehouse {
  id: string;
  code: string;
  name: string;
  active: boolean;
}
interface ValuationRow {
  sku: string;
  productName: string;
  warehouseName: string;
  quantityOnHand: number;
  averageCost: number;
  value: number;
}

export default function InventoryPage({ params }: { params: { clientId: string } }) {
  const { clientId } = params;
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [valuation, setValuation] = useState<{ rows: ValuationRow[]; totalValue: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({ sku: "", name: "", inventoryAccountId: "", cogsAccountId: "" });
  const [warehouseForm, setWarehouseForm] = useState({ code: "", name: "" });
  const [movementType, setMovementType] = useState<"receipt" | "issue">("receipt");
  const [movementForm, setMovementForm] = useState({
    productId: "",
    warehouseId: "",
    date: new Date().toISOString().slice(0, 10),
    quantity: "",
    unitCost: "",
    fundingAccountId: "",
    reference: "",
  });

  const assetAccounts = accounts.filter((a) => a.type === "ASSET");
  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");

  async function load() {
    try {
      const [p, w, acc, val] = await Promise.all([
        api<Product[]>(`/clients/${clientId}/products`),
        api<Warehouse[]>(`/clients/${clientId}/warehouses`),
        api<Account[]>(`/clients/${clientId}/accounts`),
        api<{ rows: ValuationRow[]; totalValue: number }>(`/clients/${clientId}/inventory/valuation`),
      ]);
      setProducts(p);
      setWarehouses(w);
      setAccounts(acc);
      setValuation(val);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load inventory");
    }
  }

  useEffect(() => {
    load();
  }, [clientId]);

  async function onCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/clients/${clientId}/products`, { method: "POST", body: productForm });
      setProductForm({ sku: "", name: "", inventoryAccountId: "", cogsAccountId: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create product");
    }
  }

  async function onCreateWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api(`/clients/${clientId}/warehouses`, { method: "POST", body: warehouseForm });
      setWarehouseForm({ code: "", name: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create warehouse");
    }
  }

  async function onMovement(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (movementType === "receipt") {
        await api(`/clients/${clientId}/stock-movements/receipt`, {
          method: "POST",
          body: {
            productId: movementForm.productId,
            warehouseId: movementForm.warehouseId,
            date: movementForm.date,
            quantity: parseFloat(movementForm.quantity) || 0,
            unitCost: parseFloat(movementForm.unitCost) || 0,
            fundingAccountId: movementForm.fundingAccountId,
            reference: movementForm.reference || undefined,
          },
        });
      } else {
        await api(`/clients/${clientId}/stock-movements/issue`, {
          method: "POST",
          body: {
            productId: movementForm.productId,
            warehouseId: movementForm.warehouseId,
            date: movementForm.date,
            quantity: parseFloat(movementForm.quantity) || 0,
            reference: movementForm.reference || undefined,
          },
        });
      }
      setMessage(`Stock ${movementType} posted.`);
      setMovementForm({ productId: "", warehouseId: "", date: new Date().toISOString().slice(0, 10), quantity: "", unitCost: "", fundingAccountId: "", reference: "" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to post stock ${movementType}`);
    }
  }

  return (
    <div className="stack">
      <h2 style={{ fontSize: 16, margin: 0 }}>Inventory</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="muted">{message}</div>}

      <div className="row" style={{ alignItems: "flex-start" }}>
        <form onSubmit={onCreateProduct} className="card stack" style={{ flex: 1, minWidth: 280 }}>
          <strong>New product</strong>
          <input placeholder="SKU" value={productForm.sku} onChange={(e) => setProductForm((f) => ({ ...f, sku: e.target.value }))} required />
          <input placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} required />
          <select value={productForm.inventoryAccountId} onChange={(e) => setProductForm((f) => ({ ...f, inventoryAccountId: e.target.value }))} required>
            <option value="">Inventory account</option>
            {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
          <select value={productForm.cogsAccountId} onChange={(e) => setProductForm((f) => ({ ...f, cogsAccountId: e.target.value }))} required>
            <option value="">COGS account</option>
            {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
          </select>
          <button type="submit">Add product</button>
        </form>

        <form onSubmit={onCreateWarehouse} className="card stack" style={{ flex: 1, minWidth: 280 }}>
          <strong>New warehouse</strong>
          <input placeholder="Code" value={warehouseForm.code} onChange={(e) => setWarehouseForm((f) => ({ ...f, code: e.target.value }))} required />
          <input placeholder="Name" value={warehouseForm.name} onChange={(e) => setWarehouseForm((f) => ({ ...f, name: e.target.value }))} required />
          <button type="submit">Add warehouse</button>
        </form>
      </div>

      <form onSubmit={onMovement} className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Stock movement</strong>
          <div className="row">
            <button type="button" className={movementType === "receipt" ? "" : "secondary"} onClick={() => setMovementType("receipt")}>Receipt</button>
            <button type="button" className={movementType === "issue" ? "" : "secondary"} onClick={() => setMovementType("issue")}>Issue</button>
          </div>
        </div>
        <div className="row">
          <select value={movementForm.productId} onChange={(e) => setMovementForm((f) => ({ ...f, productId: e.target.value }))} required>
            <option value="">Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
          </select>
          <select value={movementForm.warehouseId} onChange={(e) => setMovementForm((f) => ({ ...f, warehouseId: e.target.value }))} required>
            <option value="">Warehouse</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} - {w.name}</option>)}
          </select>
          <input type="date" value={movementForm.date} onChange={(e) => setMovementForm((f) => ({ ...f, date: e.target.value }))} required />
          <input type="number" step="0.0001" placeholder="Quantity" style={{ width: 100 }} value={movementForm.quantity} onChange={(e) => setMovementForm((f) => ({ ...f, quantity: e.target.value }))} required />
          {movementType === "receipt" && (
            <input type="number" step="0.0001" placeholder="Unit cost" style={{ width: 100 }} value={movementForm.unitCost} onChange={(e) => setMovementForm((f) => ({ ...f, unitCost: e.target.value }))} required />
          )}
          {movementType === "receipt" && (
            <select value={movementForm.fundingAccountId} onChange={(e) => setMovementForm((f) => ({ ...f, fundingAccountId: e.target.value }))} required>
              <option value="">Funding account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
          )}
          <input placeholder="Reference" value={movementForm.reference} onChange={(e) => setMovementForm((f) => ({ ...f, reference: e.target.value }))} />
        </div>
        <div>
          <button type="submit">Post {movementType}</button>
        </div>
      </form>

      <div className="card">
        <strong>Valuation</strong>
        {valuation === null ? (
          <p className="muted">Loading...</p>
        ) : valuation.rows.length === 0 ? (
          <p className="muted">No stock on hand.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Qty on hand</th>
                <th>Avg cost</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {valuation.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.sku}</td>
                  <td>{r.productName}</td>
                  <td>{r.warehouseName}</td>
                  <td>{r.quantityOnHand}</td>
                  <td>{r.averageCost.toFixed(4)}</td>
                  <td>{r.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={5}>Total</td>
                <td>{valuation.totalValue.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
