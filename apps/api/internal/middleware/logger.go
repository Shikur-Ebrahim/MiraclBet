package middleware

import (
    "log"
    "net/http"
    "time"
)

func Logger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        ww := &responseWriter{ResponseWriter: w, status: http.StatusOK}
        next.ServeHTTP(ww, r)
        log.Printf("%s %s %d %s", r.Method, r.URL.Path, ww.status, time.Since(start))
    })
}

type responseWriter struct {
    http.ResponseWriter
    status int
    written bool
}

func (rw *responseWriter) WriteHeader(code int) {
    if !rw.written {
        rw.status = code
        rw.written = true
        rw.ResponseWriter.WriteHeader(code)
    }
}
