"use client";

import Header from "@/app/(components)/Header";
import {
  type NewSupplier,
  type Supplier,
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/app/state/api";
import {
  Edit2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type SupplierFormData = {
  name: string;
  phone: string;
  address: string;
};

const emptyForm: SupplierFormData = {
  name: "",
  phone: "",
  address: "",
};

const SupplierFormModal = ({
  title,
  subtitle,
  form,
  loading,
  onClose,
  onChange,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  form: SupplierFormData;
  loading?: boolean;
  onClose: () => void;
  onChange: (field: keyof SupplierFormData, value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
    <div className="flex min-h-full items-start justify-center p-4 pt-10">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Supplier name"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Phone number"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Address"
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);

const SuppliersPage = () => {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);

  const { data: suppliers = [], isLoading, isError } = useGetSuppliersQuery(search);
  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

  const totalSuppliers = suppliers.length;

  const clearForm = () => setForm(emptyForm);
  const openCreate = () => {
    clearForm();
    setEditingSupplier(null);
    setIsCreateOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });
  };

  const onFieldChange = (field: keyof SupplierFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const mapFormToPayload = (): NewSupplier => ({
    name: form.name.trim(),
    phone: form.phone.trim() || undefined,
    address: form.address.trim() || undefined,
  });

  const onCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createSupplier(mapFormToPayload()).unwrap();
      toast.success("Supplier created");
      setIsCreateOpen(false);
      clearForm();
    } catch {
      // global error toast handles failures
    }
  };

  const onEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      await updateSupplier({
        supplierId: editingSupplier.supplierId,
        data: mapFormToPayload(),
      }).unwrap();
      toast.success("Supplier updated");
      setEditingSupplier(null);
      clearForm();
    } catch {
      // global error toast handles failures
    }
  };

  const onDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    try {
      await deleteSupplier(supplier.supplierId).unwrap();
      toast.success("Supplier deleted");
    } catch {
      // global error toast handles failures
    }
  };

  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
      ),
    [suppliers],
  );

  return (
    <div className="mx-auto pb-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Suppliers" />
          <p className="text-sm text-gray-500 mt-1">
            Manage purchase shops and supplier contacts
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Suppliers</p>
            <p className="text-xl font-semibold text-gray-900">{totalSuppliers}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500">
          Failed to load suppliers
        </div>
      ) : sortedSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No suppliers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sortedSuppliers.map((supplier, index) => (
            <div
              key={supplier.supplierId}
              className={`px-5 py-4 ${index !== 0 ? "border-t border-gray-100" : ""}`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{supplier.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {supplier.phone || "No phone"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {supplier.address || "No address"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={() => onDelete(supplier)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isCreateOpen && (
        <SupplierFormModal
          title="Add Supplier"
          subtitle="Create a new purchase supplier"
          form={form}
          loading={isCreating}
          onClose={() => setIsCreateOpen(false)}
          onChange={onFieldChange}
          onSubmit={onCreateSubmit}
        />
      )}

      {editingSupplier && (
        <SupplierFormModal
          title="Edit Supplier"
          subtitle={`Update details for ${editingSupplier.name}`}
          form={form}
          loading={isUpdating}
          onClose={() => setEditingSupplier(null)}
          onChange={onFieldChange}
          onSubmit={onEditSubmit}
        />
      )}
    </div>
  );
};

export default SuppliersPage;
