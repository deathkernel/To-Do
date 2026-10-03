# Runtime Systems

This batch adds executable domain services for recurrence, reminders, collaboration permissions, sync idempotency/conflicts, automation eligibility, integration/token validity and backup validation.

These services deliberately do not bypass API authorization or persistence. Workers and provider adapters must call them rather than duplicating business rules.