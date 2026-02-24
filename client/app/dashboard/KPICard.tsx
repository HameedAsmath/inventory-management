"use client";

import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

type KPICardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
};

const KPICard = ({
  title,
  value,
  icon: Icon,
  iconColor,
  iconBgColor,
  trend,
  subtitle,
}: KPICardProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500">vs last period</span>
            </div>
          )}
        </div>
        <div
          className={`${iconBgColor} p-3 rounded-lg flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
