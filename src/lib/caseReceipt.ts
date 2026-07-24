import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getApiUrl } from '@/config/env';
import { getAccessToken } from '@/lib/storage';
import { getCaseReceiptPdfPath } from '@/services/caseOrders';
import { toast } from '@/lib/toast';

/**
 * Download CASE order receipt PDF with Authorization and share it.
 */
export async function openCaseReceiptPdf(orderId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    toast.error('Please sign in again', 'Session');
    return;
  }

  const url = `${getApiUrl()}${getCaseReceiptPdfPath(orderId)}`;
  const destination = new File(Paths.cache, `case-receipt-${orderId}.pdf`);

  try {
    const file = await File.downloadFileAsync(url, destination, {
      headers: { Authorization: `Bearer ${token}` },
      idempotent: true,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'CASE order receipt',
        UTI: 'com.adobe.pdf',
      });
      return;
    }

    toast.success('Receipt downloaded', file.uri);
  } catch (e: any) {
    toast.error(e?.message ?? 'Could not open receipt PDF');
    throw e;
  }
}
