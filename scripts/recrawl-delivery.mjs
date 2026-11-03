// Постоянный отказ API не должен превращаться в сотни одинаковых POST.
export function stopRecrawl(status, consecutiveFailures) {
  return [401,403,429].includes(status) || consecutiveFailures >= 3;
}
