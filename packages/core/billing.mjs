// Input must be the invoices already authorized for the responsible adult.
// Consolidation changes presentation; settlement requires the payment provider.
export function consolidateInvoices(invoices) {
  const groups = new Map();
  for (const invoice of invoices) {
    const id = JSON.stringify([invoice.reference, invoice.status]);
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        reference: invoice.reference,
        status: invoice.status,
        due: invoice.due,
        amount: 0,
        invoices: [],
      };
      groups.set(id, group);
    }
    group.invoices.push(invoice);
    group.amount += invoice.amount;
    if (invoice.due < group.due) group.due = invoice.due;
  }
  return [...groups.values()].sort((a, b) => a.due.localeCompare(b.due));
}
