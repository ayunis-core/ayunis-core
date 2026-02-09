Password Hashing
Bcrypt-based password hashing and comparison through port abstraction.

Provides secure password hashing and verification using bcrypt. Exposes two use cases—hash-text and compare-hash—behind a `HashingHandler` port, enabling swappable hashing implementations.

This module encapsulates all cryptographic hashing operations in Ayunis. The key abstraction is the `HashingHandler` port (abstract class) with `hash()` and `compare()` methods, implemented by `BcryptHandler` in the infrastructure layer. Two use cases wrap these operations: `HashTextUseCase` takes plaintext and returns a bcrypt hash, while `CompareHashUseCase` verifies plaintext against a stored hash. The module has no domain entities or persistence layer since it is a stateless utility. It integrates primarily with **authentication** (hashing passwords during registration, verifying during login) and **users** (password reset flows). Hashing errors are defined for failure scenarios like invalid input. The port-based design allows easy replacement of bcrypt with argon2 or other algorithms without changing consumers.
