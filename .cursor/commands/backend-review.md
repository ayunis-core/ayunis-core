# 🧩 Hexagonal Architecture Alignment Check (AI Command)

## 🧠 Command
Analyze the **current file, module, or code changes** to determine whether they align with **Hexagonal Architecture (Ports and Adapters)** principles.

---

## 🧭 Evaluation Criteria

1. **Layer Identification**
   - Classify the code into one of these layers:
     - **Domain** — Pure business logic, independent of frameworks or infrastructure.
     - **Application** — Coordinates use cases; depends only on domain abstractions.
     - **Infrastructure** — Implements adapters for persistence, APIs, frameworks, etc.
     - **Interface (Delivery)** — Handles I/O or requests, delegates to application layer.

2. **Boundary Rules**
   - Ensure dependencies point **inward** (outer → inner).
   - Domain code must not depend on infrastructure or frameworks.
   - Application layer should not contain I/O or persistence logic.

3. **Violations to Flag**
   - Infrastructure imports inside domain logic.
   - Business rules mixed with technical concerns (e.g., HTTP, DB, or UI).
   - Missing ports/interfaces for external integrations.
   - Circular or reversed dependencies between layers.

4. **Expected AI Output**
   - **Layer Classification:** Which layer this file belongs to.
   - **Architectural Alignment:** `Aligned` / `Partially Aligned` / `Misaligned`
   - **Issues Found:** List of boundary or dependency violations.
   - **Recommendations:** Concrete refactoring advice to restore hexagonal alignment.

---

## ⚙️ Input
Use the **current file or diff** from the editor as the input context — no manual pasting required.

---

✅ *Goal: Ensure the code adheres to the Hexagonal Architecture (Ports and Adapters) principles, with clear separation of concerns and inward-facing dependencies.*
