package main

import (
	"context"

	"github.com/miraclbet/api/internal/database"
	"github.com/miraclbet/api/internal/handlers"
)

func settleAutoWinBets(db *database.DB) {
	if db == nil {
		return
	}
	handlers.SettleDueAutoWinSlips(context.Background(), db)
}
