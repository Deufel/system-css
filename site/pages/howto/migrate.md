---
title: Migrations
section: howto
order: 5
---

The schema is a directory of numbered SQL files. The baseline is the
whole declaration; every later file is one change; the runner applies
them in order, once, each in its own transaction with a foreign-key
check before commit, and records a checksum so a committed file can
never change. The module lives at
[github.com/Deufel/migrate](https://github.com/Deufel/migrate).

## Boot wiring

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

## The next change

```
go run github.com/Deufel/migrate/cmd/migrate -dir db/migrations new add-visit-table
```

A structure change is a rebuild written in SQL: create the new table,
`INSERT … SELECT`, drop the old, rename, recreate the indexes. The
declaration changes and the data follows in the same file. A file that
strands a child row is refused whole.

## Reading the record

```
go run github.com/Deufel/migrate/cmd/migrate -db data/app.db -dir db/migrations status
```
