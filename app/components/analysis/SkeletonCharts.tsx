"use client";

import { Skeleton } from "@/components/shared/ui";

export default function SkeletonCharts() {
  return (
    <>
      <div className="bg-white rounded-2xl p-4 mb-5 shadow-sm">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-3" />
        <div className="flex justify-center items-center">
          <Skeleton className="h-[300px] w-[300px] rounded-full" />
        </div>
        <div className="mt-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="w-3 h-3 rounded mr-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-3" />
        <Skeleton className="h-[200px] w-full mb-4" />
        <div className="mt-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-2">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
