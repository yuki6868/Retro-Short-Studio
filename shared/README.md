# shared

DTOs, JSON Schemas, and boundary contracts shared between Retro Short Studio layers.

Rules:

- Do not import from `frontend`, `core`, `app`, `engine`, or `storage`.
- Keep DTOs as plain data.
- Put behavior in `core`, `app`, or `engine`, not here.
- Treat this layer as the contract that can cross process boundaries later.
