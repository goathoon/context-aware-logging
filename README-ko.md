# 맥락 기반 로깅 및 RAG 옵저버빌리티 시스템

> 파편화된 로그를 풍부한 맥락을 가진 데이터로 전환하고, AI를 통해 지능적으로 분석하는 차세대 옵저버빌리티 시스템입니다.

이 프로젝트는 전통적인 텍스트 기반 로깅의 한계를 극복하기 위해, 하나의 요청을 하나의 '와이드 이벤트(Wide Event)'로 취급하고 이를 RAG(Retrieval-Augmented Generation) 파이프라인과 결합하여 점진적으로 발전시키는 과정을 담고 있습니다.

---

## 📖 문서 안내

이 프로젝트의 **기술적 배경, 아키텍처 철학, 개발 동기**에 대한 자세한 내용은 아래 문서를 참조해주세요.

- [**Overview-ko.md (프로젝트 철학 및 배경)**](./Overview-ko.md)

---

## 🚀 빠른 시작

### 1. 요구 사항

- Node.js (v20 이상 권장)
- pnpm
- Docker & Docker Compose (Phase 2~5 인프라용)

### 2. 설치 및 환경 설정

```bash
# 프로젝트 디렉토리로 이동
cd context-aware-logging/backend
# 의존성 설치
pnpm install

# 환경 변수 설정 (.env 파일 생성 및 API 키 입력)
# backend/.env.example 파일을 참고하여 .env 파일을 작성해주세요.
# Gemini API Key, Voyage AI API Key 등이 필요합니다.
```

### 3. 인프라 실행 (Docker)

```bash
cd docker
docker-compose up -d
```

---

## 🛠️ Phase별 활용 가이드 (1단계 ~ 5단계)

본 프로젝트는 총 5단계의 페이즈를 거쳐 완성됩니다. 각 단계를 직접 테스트하며 시스템의 진화를 경험해볼 수 있습니다.

### Phase 1: 와이드 이벤트 로깅 (Local JSON)

하나의 요청이 어떻게 풍부한 맥락(Context)을 가진 JSON 데이터로 남는지 확인합니다.

- **테스트**: `POST /payments` 엔드포인트로 요청을 보냅니다.
  - 테스트 방법:

    ```bash
      # test_data 디렉토리에 mock 데이터가 담긴 JSON 파일을 생성합니다.

      node run <프로젝트 Root>/test_data/generator.js

      # backend 가 동작 중인 상태에서 mock 데이터를 기반으로 한 `POST /payments` 요청을 2,000 번 (기본) 생성합니다.

      bash <프로젝트 Root>/test_data/run_load_test.sh
    ```

- **결과 확인**: `backend/logs/app.log` 파일에 한 줄의 JSON(Wide Event)이 기록됩니다.

### Phase 2: MongoDB 영속화 및 쿼리

로컬 파일에 저장되던 로그를 MongoDB 시계열 컬렉션에 저장하여 쿼리 가능한 자산으로 만듭니다.

- **사전 준비**:
  - Docker Compose 또는 외부 MongoDB 가 어플리케이션과 연결되어 있어야 합니다.
  - 외부 MongoDB를 사용중이라면 <프로젝트 Root>/docker/mongo/mongodb-init.js 에 Phase 2 단계 까지의 MongoDB 오브젝트가 생성되어 있어야 합니다.
- **테스트 방법**: Phase 1과 동일하게 요청을 발생시킵니다.
- **결과 확인**: MongoDB의 `logs` 컬렉션에 데이터가 적재되었는지 확인합니다.

### Phase 3: RAG 기반 시맨틱 저장 (Vector DB)

로그 데이터를 요약(Summarization)하고 벡터화하여 시맨틱 검색이 가능한 형태로 저장합니다.

- **사전 준비**:
  - VoyageAI의 API키를 환경변수에 등록해야 합니다.
  - 외부 MongoDB를 사용중이라면 <프로젝트 Root>/docker/mongo/mongodb-init.js 에 Phase 3 단계 까지의 MongoDB 오브젝트가 생성되어 있어야 합니다.
- **테스트 방법**: `POST /embeddings/batch?limit=<임베딩을 진행할 로그 갯수(정수)>` 요청을 보내 적재된 로그를 배치 처리합니다.
- **결과 확인**: Vector DB(Pinecone 또는 Atlas)에 로그의 의미적 벡터가 저장됩니다.

### Phase 4: 지능형 로그 분석 (RAG Search)

자연어로 로그 데이터에 대해 질문하고 AI의 분석 답변을 받습니다.

- **사전 준비**:
  - VoyageAI의 API키를 환경변수에 등록해야 합니다.
  - Gemini flash 2.0의 API키를 환경변수에 등록해야 합니다.
  - 외부 MongoDB를 사용중이라면 <프로젝트 Root>/docker/mongo/mongodb-init.js 에 Phase 4 단계 까지의 MongoDB 오브젝트가 생성되어 있어야 합니다.
- **테스트 방법**:
  - 의미적 검색: `GET /search/ask?q=최근에 발생한 결제 오류의 원인이 뭐야?`와 같이 질문합니다성.
  - 세션 영속성 확인(Phase 4 에선 In-memory 를, Phase 5에선 Redis를 캐시 저장소로 사용합니다.): `GET /search/ask?q=방금 내가 한 질문이 뭐야?`와 같이 질문합니다성.
- **결과 확인**: AI가 실제 로그 데이터 / 캐시에 저장된 세션의 대화내역을 근거로 분석한 답변을 반환합니다.

### Phase 5: 운영 안정화 (Hardening)

Kafka를 통한 로그 수집 디커플링, Redis 캐싱, 샘플링 전략을 통해 시스템을 견고하게 만듭니다.

- **테스트 방법**: 대량의 요청을 보내거나 Kafka 인프라를 일시 정지시켜 폴백(Fallback) 로직이 작동하는지 확인합니다.
- **결과 확인**: 시스템 부하가 조절되고, 장애 상황에서도 로그 유실 없이 안전하게 처리됩니다.

---

## 🏗️ 프로젝트 구조

```bash
.
├── backend/            # NestJS 서버 소스 코드
│   ├── src/            # 비즈니스 로직 (Payments, Embeddings 등)
│   └── libs/logging/   # 핵심 로깅 라이브러리 (Phase 1~5 공통)
├── docker/             # 인프라 구성을 위한 Docker Compose 파일
├── docs/               # Phase별 상세 설계 문서
└── Overview-ko.md      # 프로젝트 철학 및 상세 배경
```

---

## ✨ 작성자

- **orca1001** (1인 개발)
