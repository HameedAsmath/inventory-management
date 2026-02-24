"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import StoreProvider, { useAppSelector } from "./redux";
import { useGetMeQuery } from "./state/api";
import { Toaster } from "sonner";

const AUTH_ROUTES = ["/login", "/signup"];

const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  const { data: user, isLoading, isError } = useGetMeQuery(undefined, {
    skip: isAuthPage,
  });

  useEffect(() => {
    if (isAuthPage && user) {
      router.replace("/dashboard");
    }
    if (!isAuthPage && !isLoading && isError) {
      router.replace("/login");
    }
  }, [isAuthPage, user, isLoading, isError, router]);

  if (isAuthPage) {
    if (user) return null;
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return null;
  }

  return <>{children}</>;
};

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  if (isAuthPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div
        className={`${
          isDarkMode ? "dark" : "light"
        } flex bg-gray-50 text-gray-900 w-full min-h-screen`}
      >
        <Sidebar />
        <main
          className={`flex flex-col w-full h-full py-7 px-9 bg-gray-50 ${
            isSidebarCollapsed ? "md:pl-24" : "md:pl-72"
          }`}
        >
          <Navbar />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
};

const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <Toaster position="top-right" richColors closeButton />
      <DashboardLayout>{children}</DashboardLayout>
    </StoreProvider>
  );
};

export default DashboardWrapper;
