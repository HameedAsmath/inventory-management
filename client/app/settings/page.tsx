"use client";

import React, { useState } from "react";
import Header from "@/app/(components)/Header";
import { useGetMeQuery, useUpdateMeMutation } from "@/app/state/api";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const { data: profile, isLoading } = useGetMeQuery();
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();

  const initialForm = React.useMemo(() => ({
    name: profile?.name ?? "",
    shopName: profile?.shopName ?? "",
    shopAddress: profile?.shopAddress ?? "",
    shopPincode: profile?.shopPincode ?? "",
    shopContact: profile?.shopContact ?? "",
    shopEmail: profile?.shopEmail ?? "",
    shopGst: profile?.shopGst ?? "",
  }), [profile]);

  const [form, setForm] = useState(initialForm);
  const [initialized, setInitialized] = useState(false);

  if (profile && !initialized) {
    setForm({
      name: profile.name,
      shopName: profile.shopName,
      shopAddress: profile.shopAddress,
      shopPincode: profile.shopPincode,
      shopContact: profile.shopContact,
      shopEmail: profile.shopEmail,
      shopGst: profile.shopGst,
    });
    setInitialized(true);
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateMe(form).unwrap();
      toast.success("Settings saved successfully");
    } catch {
      // error toast is handled globally by the middleware
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Header name="Settings" />
        <div className="flex items-center justify-center mt-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const fields: { label: string; key: keyof typeof form; placeholder: string }[] = [
    { label: "Your Name", key: "name", placeholder: "John Doe" },
    { label: "Shop / Business Name", key: "shopName", placeholder: "My Shop" },
    { label: "Shop Address", key: "shopAddress", placeholder: "123 Main Street, City" },
    { label: "Pincode", key: "shopPincode", placeholder: "600001" },
    { label: "Contact Number", key: "shopContact", placeholder: "+91 9876543210" },
    { label: "Shop Email", key: "shopEmail", placeholder: "shop@example.com" },
    { label: "GST Number", key: "shopGst", placeholder: "29XXXXXXXXXXXZX" },
  ];

  return (
    <div className="w-full">
      <Header name="Settings" />

      <div className="mt-6 max-w-2xl">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Shop Profile</h2>
          <p className="text-sm text-gray-500 mb-6">
            These details are used in invoices and across the application.
          </p>

          <div className="space-y-4">
            {fields.map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-800"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Account email: <span className="font-medium text-gray-500">{profile?.email}</span> (cannot be changed)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
