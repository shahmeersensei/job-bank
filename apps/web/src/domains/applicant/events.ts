/** Applicant domain events (declaration merging into the shared event registry). */
declare module '@/domains/shared/events' {
  interface DomainEventMap {
    /** A profile became matchable for the first time (M9 can start suggesting jobs). */
    'applicant.activated': { applicantId: string; branchId: string };
  }
}

export {};
