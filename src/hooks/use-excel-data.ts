"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ExcelData } from "@/types";
import { readExcelData } from "@/lib/excel";

export const useExcelData = () => {
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshData = useCallback(async () => {
    if (mountedRef.current) setIsLoading(true);
    const data = await readExcelData();
    if (mountedRef.current) {
      setExcelData(data);
      setIsLoading(false);
    }
    return data;
  }, []);

  return { excelData, isLoading, refreshData };
};
