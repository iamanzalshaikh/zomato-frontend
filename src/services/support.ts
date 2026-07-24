import { apiFetch } from '@/lib/apiFetch';

export async function fetchSupportTickets() {
  const body = await apiFetch('/support/tickets');
  return (body as any)?.data?.tickets ?? (body as any)?.data ?? [];
}

export async function createSupportTicket(input: {
  issueType: string;
  description: string;
  orderId?: string;
}) {
  const body = await apiFetch('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (body as any)?.data?.ticket ?? (body as any)?.data;
}

export async function replySupportTicket(ticketId: string, message: string) {
  const body = await apiFetch('/support/tickets/reply', {
    method: 'POST',
    body: JSON.stringify({ ticketId, message }),
  });
  return (body as any)?.data ?? body;
}
