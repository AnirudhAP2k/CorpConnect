# Elasticsearch Search Layer Abstraction in Next.js + TypeScript

## Overview

Treat Elasticsearch as an infrastructure dependency. Your application should never allow UI components or API routes to talk directly to Elasticsearch.

Architecture:

```text
Next.js UI
      │
      ▼
API Route
      │
      ▼
Search Service
      │
      ▼
Search Provider Interface
      │
      ├──────── ElasticsearchProvider
      │
      ├──────── OpenSearchProvider
      │
      └──────── MeilisearchProvider
      │
      ▼
Search Engine
```

## Project Structure

```text
app/
├── api/
│   └── search/
│       └── route.ts

src/
├── search/
│   ├── client.ts
│   ├── types.ts
│   ├── queries/
│   │   ├── employee.query.ts
│   │   ├── organization.query.ts
│   │   └── global.query.ts
│   ├── repositories/
│   │   ├── employee.repository.ts
│   │   └── organization.repository.ts
│   └── services/
│       └── search.service.ts
```

## Step 1: Install Elasticsearch Client

```bash
npm install @elastic/elasticsearch
```

## Step 2: Create a Singleton Client

```ts
import { Client } from "@elastic/elasticsearch";

export const elasticClient = new Client({
  node: process.env.ELASTICSEARCH_URL,
});
```

Environment:

```env
ELASTICSEARCH_URL=http://localhost:9200
```

## Step 3: Define Search Types

```ts
export interface SearchResult<T> {
  score: number;
  source: T;
}

export interface EmployeeDocument {
  id: number;
  name: string;
  designation: string;
  skills: string[];
}

export interface OrganizationDocument {
  id: number;
  name: string;
  description: string;
}
```

## Step 4: Query Builders

### Employee Query Builder

```ts
export function employeeSearchQuery(keyword: string) {
  return {
    query: {
      multi_match: {
        query: keyword,
        fields: [
          "name^3",
          "designation^2",
          "skills"
        ]
      }
    }
  };
}
```

### Global Query Builder

```ts
export function globalSearchQuery(keyword: string) {
  return {
    query: {
      multi_match: {
        query: keyword,
        fields: [
          "name",
          "title",
          "description",
          "skills"
        ]
      }
    }
  };
}
```

## Step 5: Repository Layer

### Employee Repository

```ts
import { elasticClient } from "../client";
import { employeeSearchQuery } from "../queries/employee.query";

export class EmployeeRepository {
  async search(keyword: string) {
    const response = await elasticClient.search({
      index: "employees",
      ...employeeSearchQuery(keyword),
    });

    return response.hits.hits;
  }
}
```

### Organization Repository

```ts
import { elasticClient } from "../client";

export class OrganizationRepository {
  async search(keyword: string) {
    return elasticClient.search({
      index: "organizations",
      query: {
        match: {
          name: keyword,
        },
      },
    });
  }
}
```

## Step 6: Search Service Layer

```ts
import { EmployeeRepository } from "../repositories/employee.repository";
import { OrganizationRepository } from "../repositories/organization.repository";

export class SearchService {
  constructor(
    private employeeRepo = new EmployeeRepository(),
    private organizationRepo = new OrganizationRepository()
  ) {}

  async globalSearch(keyword: string) {
    const [employees, organizations] = await Promise.all([
      this.employeeRepo.search(keyword),
      this.organizationRepo.search(keyword),
    ]);

    return {
      employees,
      organizations,
    };
  }
}
```

## Step 7: Next.js API Route

```ts
import { SearchService } from "@/src/search/services/search.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? "";

  const service = new SearchService();

  const results = await service.globalSearch(q);

  return Response.json(results);
}
```

Frontend only calls:

```http
GET /api/search?q=laravel
```

## Step 8: Frontend Search Bar

```tsx
"use client";

import { useState } from "react";

export default function SearchBar() {
  const [results, setResults] = useState<any>();

  async function search(q: string) {
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(q)}`
    );

    const data = await response.json();

    setResults(data);
  }

  return (
    <input
      onChange={(e) => search(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## Step 9: Dependency Injection

```ts
const searchService = new SearchService(
  employeeRepository,
  organizationRepository
);
```

## Step 10: Multi-Tenant Search

```ts
export function globalSearchQuery(
  keyword: string,
  organizationId: string
) {
  return {
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: keyword,
              fields: [
                "name",
                "description",
                "skills",
              ],
            },
          },
        ],
        filter: [
          {
            term: {
              organizationId,
            },
          },
        ],
      },
    },
  };
}
```

## Step 11: Search Provider Abstraction

### Interface

```ts
export interface SearchProvider {
  search(
    index: string,
    query: object
  ): Promise<any>;
}
```

### Elasticsearch Provider

```ts
export class ElasticsearchProvider
  implements SearchProvider
{
  async search(index: string, query: object) {
    return elasticClient.search({
      index,
      ...query,
    });
  }
}
```

### OpenSearch Provider

```ts
export class OpenSearchProvider
  implements SearchProvider
{
  async search(index: string, query: object) {
    // implementation
  }
}
```

### Service Depends on Interface

```ts
export class SearchService {
  constructor(
    private provider: SearchProvider
  ) {}

  async searchEmployees(q: string) {
    return this.provider.search(
      "employees",
      employeeSearchQuery(q)
    );
  }
}
```

## Key Takeaways

1. Keep Elasticsearch access inside repositories/providers.
2. Expose simple service methods to the application.
3. Let API routes depend on services, not Elasticsearch.
4. Use query builders to centralize query construction.
5. Use provider abstractions to support future search engines.
6. Keep tenant filtering in the search layer.
7. Never expose Elasticsearch directly to clients.
