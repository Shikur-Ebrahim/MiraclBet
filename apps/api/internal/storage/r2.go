package storage

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	myconfig "github.com/miraclbet/api/internal/config"
)

type R2Service struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

func NewR2Service(cfg *myconfig.Config) (*R2Service, error) {
	if cfg.R2AccountID == "" || cfg.R2AccessKeyID == "" || cfg.R2SecretAccessKey == "" || cfg.R2BucketName == "" || cfg.R2PublicURL == "" {
		return nil, fmt.Errorf("R2 credentials not fully configured")
	}

	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL: fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.R2AccountID),
		}, nil
	})

	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.R2AccessKeyID, cfg.R2SecretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load R2 config: %v", err)
	}

	client := s3.NewFromConfig(awsCfg)

	return &R2Service{
		client:     client,
		bucketName: cfg.R2BucketName,
		publicURL:  cfg.R2PublicURL,
	}, nil
}

func (s *R2Service) UploadFile(ctx context.Context, file multipart.File, header *multipart.FileHeader) (string, error) {
	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(file); err != nil {
		return "", fmt.Errorf("failed to read file: %v", err)
	}

	fileName := fmt.Sprintf("%s-%s", uuid.New().String(), header.Filename)
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(fileName),
		Body:        bytes.NewReader(buf.Bytes()),
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to R2: %v", err)
	}

	// Return public URL (make sure R2 Public URL is configured correctly, e.g. "https://pub-xyz.r2.dev")
	return fmt.Sprintf("%s/%s", s.publicURL, fileName), nil
}
