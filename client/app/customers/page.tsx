"use client";

import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
} from "../state/api";
import {
  Plus,
  SearchIcon,
  Trash2,
  Mail,
  MapPin,
  Users,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateCustomerModal from "./CreateCustomerModal";

type CustomerFormData = {
  customerId: string;
  name: string;
  email: string;
  address: string;
};

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    data: customers,
    isLoading,
    isError,
  } = useGetCustomersQuery(searchTerm);

  const [createCustomer] = useCreateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const handleCreateCustomer = async (customerData: CustomerFormData) => {
    await createCustomer(customerData);
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(customerId).unwrap();
      } catch (error: unknown) {
        const err = error as { data?: { message?: string } };
        alert(err?.data?.message || "Failed to delete customer");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !customers) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <Users className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to fetch customers</p>
        <p className="text-sm text-gray-400 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Customers" />
          <p className="text-sm text-gray-500 mt-1">
            Manage your customer database
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {customers.length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Customers
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <Mail className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {customers.filter((c) => c.email).length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              With Email
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-purple-50 p-3">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {customers.filter((c) => c.address).length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              With Address
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full py-2.5 pl-10 pr-4 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* CUSTOMERS LIST */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <UserPlus className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">
            No customers yet
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Get started by adding your first customer.
          </p>
          <button
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {customers.map((customer) => {
            const initials = customer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const colors = [
              "bg-blue-500",
              "bg-emerald-500",
              "bg-violet-500",
              "bg-amber-500",
              "bg-rose-500",
              "bg-cyan-500",
              "bg-indigo-500",
              "bg-teal-500",
            ];
            const colorIndex =
              customer.customerId
                .split("")
                .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
              colors.length;

            return (
              <div
                key={customer.customerId}
                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* AVATAR */}
                  <div
                    className={`shrink-0 w-11 h-11 rounded-full ${colors[colorIndex]} flex items-center justify-center`}
                  >
                    <span className="text-sm font-bold text-white">
                      {initials}
                    </span>
                  </div>

                  {/* INFO */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          {customer.customerId}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteCustomer(customer.customerId)
                        }
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all duration-200 p-1 hover:bg-red-50 rounded-md"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                      {!customer.email && !customer.address && (
                        <p className="text-xs text-gray-300 italic">
                          No contact details
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCustomer}
      />
    </div>
  );
};

export default Customers;
