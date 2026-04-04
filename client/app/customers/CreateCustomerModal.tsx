"use client";

import React, { ChangeEvent, FormEvent, useState, useRef } from "react";
import { X, User, Mail, MapPin, Edit2, Plus } from "lucide-react";
import type { Customer } from "../state/api";

type CustomerFormData = {
  customerId: string;
  name: string;
  email: string;
  address: string;
};

export type CreateCustomerSubmitPayload = {
  customerId: string;
  name: string;
  address: string;
  email?: string;
};

export type UpdateCustomerSubmitPayload = {
  name: string;
  address: string;
  email?: string;
};

type CreateCustomerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateCustomerSubmitPayload) => void;
  onUpdate?: (
    customerId: string,
    data: UpdateCustomerSubmitPayload,
  ) => void;
  editingCustomer?: Customer | null;
};

const CreateCustomerModal = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingCustomer,
}: CreateCustomerModalProps) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    customerId: "",
    name: "",
    email: "",
    address: "",
  });

  const isEditing = !!editingCustomer;
  const prevEditingRef = useRef<string | null>(null);

  const editingKey = isOpen && editingCustomer ? editingCustomer.customerId : null;
  if (editingKey !== prevEditingRef.current) {
    prevEditingRef.current = editingKey;
    if (editingCustomer && isOpen) {
      setFormData({
        customerId: editingCustomer.customerId,
        name: editingCustomer.name,
        email: editingCustomer.email || "",
        address: editingCustomer.address || "",
      });
    } else {
      setFormData({ customerId: "", name: "", email: "", address: "" });
    }
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = formData.email.trim();
    const emailField = trimmedEmail ? { email: trimmedEmail } : {};

    if (isEditing && onUpdate) {
      onUpdate(editingCustomer.customerId, {
        name: formData.name,
        address: formData.address,
        ...emailField,
      });
    } else {
      onCreate({
        customerId: formData.customerId,
        name: formData.name,
        address: formData.address,
        ...emailField,
      });
    }
    setFormData({ customerId: "", name: "", email: "", address: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Edit Customer" : "Add New Customer"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing
                  ? "Update the customer details"
                  : "Fill in the customer details below"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* NAME */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  placeholder="Enter customer name"
                  onChange={handleChange}
                  value={formData.name}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="customer@example.com"
                  onChange={handleChange}
                  value={formData.email}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* ADDRESS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  name="address"
                  placeholder="Enter customer address"
                  onChange={handleChange}
                  value={formData.address}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={onClose}
                type="button"
                className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4" />
                    Update Customer
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Customer
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomerModal;
