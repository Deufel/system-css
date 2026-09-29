---
title: Migrations
section: howto
order: 6
---

The schema is a directory of numbered SQL files. The first is the whole
declaration. Each later file is one change. The runner applies them in
order, once, each in a transaction with a foreign-key check before
commit, and records a checksum. A committed file never changes. Module:
[github.com/Deufel/migrate](https://github.com/Deufel/migrate).

## Boot

```go
import "github.com/Deufel/migrate"

//go:embed migrations/*.sql
var files embed.FS

func open(path string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", path+"?_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, err
	}
	sub, _ := fs.Sub(files, "migrations")
	o := migrate.Options{FS: sub, Log: func(f string, a ...any) { slog.Info(fmt.Sprintf(f, a...)) }}
	if _, err := migrate.Run(context.Background(), db, o); err != nil {
		return nil, err
	}
	return db, nil
}
```

## Next change

```
go run github.com/Deufel/migrate/cmd/migrate -dir db/migrations new add-visit-table
```

A structure change is written as SQL: create the new table, `INSERT …
SELECT`, drop the old, rename, recreate indexes. A file that strands a
child row is refused.

## Status

```
go run github.com/Deufel/migrate/cmd/migrate -db data/app.db -dir db/migrations status
```
