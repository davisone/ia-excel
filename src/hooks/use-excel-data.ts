"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ExcelData } from "@/types";
import { readExcelData, ensureOfficeReady } from "@/lib/excel";

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

  // Écouter les changements de feuille active
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const register = async () => {
      try {
        await ensureOfficeReady();
        await Excel.run(async (context) => {
          const handler = context.workbook.worksheets.onActivated.add(async () => {
            await refreshData();
          });
          await context.sync();
          cleanup = () => {
            Excel.run(async (ctx) => {
              handler.remove();
              await ctx.sync();
            }).catch(() => {});
          };
        });
      } catch {
        // Pas dans un environnement Office — on ignore
      }
    };

    register();

    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, [refreshData]);

  return { excelData, isLoading, refreshData };
};
