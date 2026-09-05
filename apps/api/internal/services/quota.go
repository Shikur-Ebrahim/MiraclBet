package services

import (
    "github.com/miraclbet/api/internal/database"
    footballquota "github.com/miraclbet/api/internal/football/quota"
)

func NewQuotaService(db *database.DB, dailyLimit int) *footballquota.QuotaService {
    return footballquota.New(db, dailyLimit)
}
