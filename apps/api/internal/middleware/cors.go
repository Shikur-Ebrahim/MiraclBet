package middleware

import (
    "net/http"
    chiCors "github.com/go-chi/cors"
)

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
    return chiCors.Handler(chiCors.Options{
        AllowedOrigins:   allowedOrigins,
        AllowedMethods:   []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
        AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
        ExposedHeaders:   []string{"Link"},
        AllowCredentials: true,
        MaxAge:           300,
    })
}
