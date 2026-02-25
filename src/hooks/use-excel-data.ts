"use client";

import { useState, useCallback } from "react";
import { ExcelData } from "@/types";
import { readExcelData } from "@/lib/excel";

export const useExcelData = () => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const data = await readExcelData();
    setExcelData(data);
    setIsLoading(false);
    return data;
  }, []);

  return { excelData, isLoading, refreshData };
};
