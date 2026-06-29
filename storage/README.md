# storage

Storage owns project persistence boundaries.

The first implementation is `LocalJsonProjectRepository`, which stores one work as one local folder.

```text
my-video-project/
├─ project.rss.json
├─ assets/
│  ├─ characters/
│  ├─ backgrounds/
│  └─ effects/
├─ voices/
├─ renders/
└─ exports/
```

Rules:

- Core must not know how projects are saved.
- Frontend must not read or write project files directly.
- Repository implementations may be replaced later by SQLite, Cloud, or other storage.
- JSON stores DTO data only. Binary assets are stored as files and referenced by path.
