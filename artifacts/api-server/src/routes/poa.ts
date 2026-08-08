import { Router, type IRouter } from "express";
import { attachAuthUser, requireAuth } from "../middlewares/auth.middleware";
import { logger } from "../lib/logger";
import {
  ensurePoaSheetReady,
  listPoaRows,
  appendPoaRow,
  updatePoaRow,
  deletePoaRow,
} from "../services/poa.sheets.service";

const router: IRouter = Router();

interface PoaRecord {
  clientName: string;
  poaNumber: string;
  issueDateHijri: string;
  expiryDateHijri: string;
  daysRemaining: number;
  notes?: string;
  createdAt: string;
}

function rowToRecord(values: string[]): PoaRecord {
  return {
    clientName: values[0] || "",
    poaNumber: values[1] || "",
    issueDateHijri: values[2] || "",
    expiryDateHijri: values[3] || "",
    daysRemaining: Number(values[4]) || 0,
    notes: values[5] || "",
    createdAt: values[6] || new Date().toISOString(),
  };
}

function recordToRow(record: PoaRecord): string[] {
  return [
    record.clientName,
    record.poaNumber,
    record.issueDateHijri,
    record.expiryDateHijri,
    String(record.daysRemaining ?? 0),
    record.notes || "",
    record.createdAt || new Date().toISOString(),
  ];
}

/**
 * GET /api/poa
 * Lists all Power of Attorney records from the "Attorney" sheet.
 */
router.get("/poa", attachAuthUser, requireAuth, async (req, res) => {
  try {
    await ensurePoaSheetReady();
    const forceRefresh = req.query.refresh === "true";
    const rows = await listPoaRows(forceRefresh);
    const records = rows.map(({ id, values }) => ({
      ...rowToRecord(values),
      sheetRowId: id,
    }));
    res.json(records);
  } catch (err) {
    logger.error({ err }, "Failed to list POA records");
    res.status(500).json({ error: "فشل تحميل بيانات الوكالات." });
  }
});

/**
 * POST /api/poa
 * Creates a new Power of Attorney record in the "Attorney" sheet.
 */
router.post("/poa", attachAuthUser, requireAuth, async (req, res) => {
  const body = req.body as Partial<PoaRecord>;
  if (!body.clientName?.trim() || !body.poaNumber?.trim()) {
    res.status(400).json({ error: "اسم العميل ورقم الوكالة مطلوبان." });
    return;
  }
  try {
    await ensurePoaSheetReady();
    const record: PoaRecord = {
      clientName: body.clientName.trim(),
      poaNumber: body.poaNumber.trim(),
      issueDateHijri: body.issueDateHijri?.trim() || "",
      expiryDateHijri: body.expiryDateHijri?.trim() || "",
      daysRemaining: Number(body.daysRemaining) || 0,
      notes: body.notes?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    await appendPoaRow(recordToRow(record));
    logger.info("POA record created");
    res.status(201).json(record);
  } catch (err) {
    logger.error({ err }, "Failed to create POA record");
    res.status(500).json({ error: "فشل حفظ الوكالة." });
  }
});

/**
 * PUT /api/poa/:rowId
 * Updates an existing POA record. :rowId is the 1-based sheet row number.
 */
router.put("/poa/:rowId", attachAuthUser, requireAuth, async (req, res) => {
  const rowId = parseInt(String(req.params.rowId), 10);
  if (isNaN(rowId)) {
    res.status(400).json({ error: "معرف الصف غير صالح." });
    return;
  }
  const body = req.body as Partial<PoaRecord>;
  try {
    await ensurePoaSheetReady();
    const rows = await listPoaRows();
    const existing = rows.find((r) => r.id === rowId);
    if (!existing) {
      res.status(404).json({ error: "الوكالة غير موجودة." });
      return;
    }
    const existingRecord = rowToRecord(existing.values);
    const updated: PoaRecord = {
      ...existingRecord,
      clientName: body.clientName?.trim() || existingRecord.clientName,
      poaNumber: body.poaNumber?.trim() || existingRecord.poaNumber,
      issueDateHijri: body.issueDateHijri?.trim() ?? existingRecord.issueDateHijri,
      expiryDateHijri: body.expiryDateHijri?.trim() ?? existingRecord.expiryDateHijri,
      daysRemaining: body.daysRemaining !== undefined ? Number(body.daysRemaining) : existingRecord.daysRemaining,
      notes: body.notes?.trim() ?? existingRecord.notes,
    };
    await updatePoaRow(rowId, recordToRow(updated));
    logger.info({ rowId }, "POA record updated");
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update POA record");
    res.status(500).json({ error: "فشل تحديث الوكالة." });
  }
});

/**
 * DELETE /api/poa/:rowId
 * Deletes a POA record by its 1-based sheet row id.
 */
router.delete("/poa/:rowId", attachAuthUser, requireAuth, async (req, res) => {
  const rowId = parseInt(String(req.params.rowId), 10);
  if (isNaN(rowId)) {
    res.status(400).json({ error: "معرف الصف غير صالح." });
    return;
  }
  try {
    await deletePoaRow(rowId);
    logger.info({ rowId }, "POA record deleted");
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete POA record");
    res.status(500).json({ error: "فشل حذف الوكالة." });
  }
});

export default router;
