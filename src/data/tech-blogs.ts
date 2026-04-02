/**
 * Tech Engineering Blogs Database
 *
 * Major Korean and International tech company engineering blogs
 * for developer interview preparation case studies.
 *
 * Last updated: 2026-04-02
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlogLanguage = "ko" | "en" | "both";

export type TechDomain =
  | "frontend"
  | "backend"
  | "mobile"
  | "devops"
  | "data"
  | "ai-ml"
  | "infrastructure"
  | "security"
  | "design-system"
  | "full-stack"
  | "platform"
  | "blockchain";

export type CompanyType =
  | "big-tech"
  | "fintech"
  | "e-commerce"
  | "social"
  | "mobility"
  | "entertainment"
  | "proptech"
  | "foodtech"
  | "gaming"
  | "cloud"
  | "developer-tools"
  | "enterprise";

export type Region = "kr" | "intl";

export interface TechBlog {
  /** Company name (English) */
  company: string;
  /** Company name in Korean (if applicable) */
  companyKo?: string;
  /** Blog URL */
  url: string;
  /** Alternative/secondary blog URLs */
  altUrls?: string[];
  /** Primary tech domains covered */
  domains: TechDomain[];
  /** Company type */
  companyType: CompanyType;
  /** Content language */
  language: BlogLanguage;
  /** Region */
  region: Region;
  /** Short description of blog focus */
  description: string;
}

// ---------------------------------------------------------------------------
// Korean Tech Blogs (국내)
// ---------------------------------------------------------------------------

export const KOREAN_TECH_BLOGS: TechBlog[] = [
  // ── Big Tech ──────────────────────────────────────────────────────────
  {
    company: "Kakao",
    companyKo: "카카오",
    url: "https://tech.kakao.com/",
    domains: ["backend", "frontend", "ai-ml", "infrastructure", "data"],
    companyType: "big-tech",
    language: "ko",
    region: "kr",
    description:
      "카카오 서비스 개발 사례, 사내 기술 세미나, 밋업 및 컨퍼런스 소식",
  },
  {
    company: "Kakao Pay",
    companyKo: "카카오페이",
    url: "https://tech.kakaopay.com/",
    domains: ["backend", "frontend", "infrastructure", "security"],
    companyType: "fintech",
    language: "ko",
    region: "kr",
    description: "카카오페이 금융 서비스 기술 사례, 결제/송금 시스템 아키텍처",
  },
  {
    company: "Kakao Bank",
    companyKo: "카카오뱅크",
    url: "https://tech.kakaobank.com/",
    domains: ["backend", "infrastructure", "security", "data"],
    companyType: "fintech",
    language: "ko",
    region: "kr",
    description: "카카오뱅크 기술로 은행을 엔지니어링하는 개발 이야기",
  },
  {
    company: "Naver",
    companyKo: "네이버",
    url: "https://d2.naver.com/home",
    domains: ["frontend", "backend", "ai-ml", "data", "infrastructure"],
    companyType: "big-tech",
    language: "ko",
    region: "kr",
    description:
      "네이버 D2 - 네이버 개발자 기술 블로그, 검색/AI/플랫폼 기술 심층 분석",
  },
  {
    company: "LY Corporation (LINE)",
    companyKo: "라인 (LY Corporation)",
    url: "https://techblog.lycorp.co.jp/ko",
    altUrls: ["https://engineering.linecorp.com/ko/blog"],
    domains: ["backend", "frontend", "mobile", "infrastructure", "ai-ml"],
    companyType: "big-tech",
    language: "both",
    region: "kr",
    description:
      "LINE/Yahoo Japan 통합 기술블로그, 메시징 플랫폼 대규모 시스템",
  },
  {
    company: "Coupang",
    companyKo: "쿠팡",
    url: "https://medium.com/coupang-engineering",
    altUrls: ["https://medium.com/coupang-tech"],
    domains: ["backend", "data", "infrastructure", "ai-ml", "platform"],
    companyType: "e-commerce",
    language: "both",
    region: "kr",
    description:
      "쿠팡 엔지니어링 - 이커머스 대규모 트래픽 처리, 물류/배송 최적화",
  },
  {
    company: "Toss",
    companyKo: "토스",
    url: "https://toss.tech/",
    domains: [
      "frontend",
      "backend",
      "mobile",
      "design-system",
      "infrastructure",
    ],
    companyType: "fintech",
    language: "ko",
    region: "kr",
    description:
      "토스 기술 블로그 - 금융 서비스 UX, 디자인 시스템, 서버 아키텍처",
  },
  {
    company: "Woowa Brothers",
    companyKo: "우아한형제들 (배민)",
    url: "https://techblog.woowahan.com/",
    domains: ["backend", "frontend", "infrastructure", "devops", "data"],
    companyType: "foodtech",
    language: "ko",
    region: "kr",
    description:
      "배달의민족 기술조직 성장 이야기, 대규모 트래픽 처리, DDD/MSA 사례",
  },
  {
    company: "Samsung SDS",
    companyKo: "삼성SDS",
    url: "https://www.samsungsds.com/kr/insights/index.html",
    altUrls: ["https://www.samsungsds.com/en/research-blog/index.html"],
    domains: ["ai-ml", "infrastructure", "security", "data", "platform"],
    companyType: "enterprise",
    language: "both",
    region: "kr",
    description: "삼성SDS 인사이트 리포트 - AI, 클라우드, 보안 기술 연구",
  },
  {
    company: "SK Planet",
    companyKo: "SK 플래닛",
    url: "https://techtopic.skplanet.com/",
    domains: ["backend", "data", "ai-ml", "platform"],
    companyType: "big-tech",
    language: "ko",
    region: "kr",
    description: "SK 플래닛 TECH TOPIC - 커머스/광고 플랫폼 기술 사례",
  },
  {
    company: "NHN",
    companyKo: "NHN",
    url: "https://meetup.nhncloud.com/",
    domains: ["backend", "frontend", "infrastructure", "devops", "platform"],
    companyType: "cloud",
    language: "ko",
    region: "kr",
    description: "NHN Cloud Meetup - 클라우드/게임/결제 플랫폼 기술 공유",
  },

  // ── Startups & Scale-ups ──────────────────────────────────────────────
  {
    company: "Karrot",
    companyKo: "당근",
    url: "https://medium.com/daangn",
    domains: ["backend", "frontend", "mobile", "infrastructure", "ai-ml"],
    companyType: "social",
    language: "ko",
    region: "kr",
    description:
      "당근 테크 블로그 - 하이퍼로컬 서비스, 검색/추천, 모바일 아키텍처",
  },
  {
    company: "Devsisters",
    companyKo: "데브시스터즈",
    url: "https://tech.devsisters.com/",
    domains: ["backend", "infrastructure", "devops", "data"],
    companyType: "gaming",
    language: "ko",
    region: "kr",
    description:
      "데브시스터즈 DEVTECH - 쿠키런 서버 아키텍처, 게임 인프라, Kubernetes",
  },
  {
    company: "Hyperconnect",
    companyKo: "하이퍼커넥트",
    url: "https://hyperconnect.github.io/",
    domains: ["backend", "mobile", "ai-ml", "infrastructure"],
    companyType: "social",
    language: "ko",
    region: "kr",
    description:
      "하이퍼커넥트 기술블로그 - 실시간 영상/음성 처리, WebRTC, ML 매칭",
  },
  {
    company: "Bucketplace",
    companyKo: "버킷플레이스 (오늘의집)",
    url: "https://www.bucketplace.com/culture/Tech/",
    domains: ["frontend", "backend", "mobile", "data"],
    companyType: "e-commerce",
    language: "ko",
    region: "kr",
    description:
      "오늘의집 Tech - 라이프스타일 커머스 플랫폼 기술, 이미지 처리, 추천",
  },
  {
    company: "SOCAR",
    companyKo: "쏘카",
    url: "https://tech.socarcorp.kr/",
    domains: ["frontend", "backend", "mobile", "data", "design-system"],
    companyType: "mobility",
    language: "ko",
    region: "kr",
    description:
      "쏘카 기술블로그 - 모빌리티 플랫폼, 차량 IoT, 디자인 시스템, 데이터",
  },
  {
    company: "Kurly",
    companyKo: "컬리",
    url: "https://helloworld.kurly.com/",
    domains: ["backend", "frontend", "infrastructure", "data", "devops"],
    companyType: "e-commerce",
    language: "ko",
    region: "kr",
    description:
      "컬리 기술 블로그 - 신선식품 이커머스, 물류 최적화, 추천 시스템",
  },
  {
    company: "Banksalad",
    companyKo: "뱅크샐러드",
    url: "https://blog.banksalad.com/tech/",
    domains: ["frontend", "backend", "mobile", "data", "infrastructure"],
    companyType: "fintech",
    language: "ko",
    region: "kr",
    description:
      "뱅크샐러드 기술 블로그 - 마이데이터, 금융 데이터 분석, 모바일 앱",
  },
  {
    company: "RIDI",
    companyKo: "리디",
    url: "https://ridicorp.com/story-category/tech-blog/",
    domains: ["frontend", "backend", "mobile", "infrastructure"],
    companyType: "entertainment",
    language: "ko",
    region: "kr",
    description:
      "리디 기술 블로그 - 전자책/웹툰 서비스, 리더 엔진, 콘텐츠 플랫폼",
  },
  {
    company: "WATCHA",
    companyKo: "왓챠",
    url: "https://medium.com/watcha",
    domains: ["backend", "data", "ai-ml", "mobile"],
    companyType: "entertainment",
    language: "ko",
    region: "kr",
    description:
      "왓챠 기술 블로그 - OTT 스트리밍, 추천 알고리즘, 콘텐츠 서비스",
  },
  {
    company: "Yogiyo",
    companyKo: "요기요",
    url: "https://medium.com/deliverytechkorea",
    domains: ["backend", "frontend", "mobile", "data"],
    companyType: "foodtech",
    language: "ko",
    region: "kr",
    description:
      "요기요 (Delivery Hero Korea) 기술 블로그 - 배달 플랫폼, 주문 시스템",
  },
  {
    company: "29CM",
    companyKo: "29CM",
    url: "https://medium.com/29cm",
    domains: ["frontend", "backend", "mobile", "design-system"],
    companyType: "e-commerce",
    language: "ko",
    region: "kr",
    description: "29CM 기술 블로그 - 큐레이션 커머스, UX 개선, 결제 시스템",
  },
  {
    company: "MUSINSA",
    companyKo: "무신사",
    url: "https://medium.com/musinsa-tech",
    altUrls: ["https://techblog.musinsa.com/"],
    domains: ["frontend", "backend", "infrastructure", "data"],
    companyType: "e-commerce",
    language: "ko",
    region: "kr",
    description:
      "무신사 테크 블로그 - 패션 커머스, 대규모 트래픽 처리, 검색/추천",
  },
  {
    company: "Zigbang",
    companyKo: "직방",
    url: "https://medium.com/zigbang",
    domains: ["frontend", "backend", "mobile", "data"],
    companyType: "proptech",
    language: "ko",
    region: "kr",
    description:
      "직방 기술 블로그 - 부동산 플랫폼, 3D/VR 홈투어, 지도/위치 서비스",
  },
];

// ---------------------------------------------------------------------------
// International Tech Blogs (해외)
// ---------------------------------------------------------------------------

export const INTERNATIONAL_TECH_BLOGS: TechBlog[] = [
  // ── Big Tech ──────────────────────────────────────────────────────────
  {
    company: "Meta",
    url: "https://engineering.fb.com/",
    domains: ["infrastructure", "ai-ml", "frontend", "mobile", "data"],
    companyType: "big-tech",
    language: "en",
    region: "intl",
    description:
      "Engineering at Meta - large-scale distributed systems, AI/ML, React, open source (PyTorch, Llama)",
  },
  {
    company: "Google",
    url: "https://developers.googleblog.com/",
    domains: ["ai-ml", "infrastructure", "platform", "frontend", "mobile"],
    companyType: "big-tech",
    language: "en",
    region: "intl",
    description:
      "Google Developers Blog - Web, Mobile, AI, Cloud platform updates and best practices",
  },
  {
    company: "Netflix",
    url: "https://netflixtechblog.com/",
    altUrls: ["https://netflixtechblog.medium.com/"],
    domains: ["backend", "infrastructure", "data", "ai-ml", "platform"],
    companyType: "entertainment",
    language: "en",
    region: "intl",
    description:
      "Netflix TechBlog - streaming at scale, microservices, chaos engineering, data pipelines",
  },
  {
    company: "AWS",
    url: "https://aws.amazon.com/blogs/architecture/",
    domains: ["infrastructure", "devops", "security", "data", "platform"],
    companyType: "cloud",
    language: "en",
    region: "intl",
    description:
      "AWS Architecture Blog - cloud architecture patterns, well-architected solutions, serverless",
  },
  {
    company: "GitHub",
    url: "https://github.blog/engineering/",
    domains: ["backend", "infrastructure", "devops", "platform", "security"],
    companyType: "developer-tools",
    language: "en",
    region: "intl",
    description:
      "GitHub Engineering - developer platform, Git internals, CI/CD, Copilot AI",
  },

  // ── Social & Communication ────────────────────────────────────────────
  {
    company: "LinkedIn",
    url: "https://engineering.linkedin.com/blog",
    domains: ["backend", "data", "ai-ml", "infrastructure", "frontend"],
    companyType: "social",
    language: "en",
    region: "intl",
    description:
      "LinkedIn Engineering - real-time data, feed ranking, search infrastructure, testing at scale",
  },
  {
    company: "X (Twitter)",
    url: "https://blog.x.com/engineering/en_us",
    domains: ["backend", "infrastructure", "data", "ai-ml"],
    companyType: "social",
    language: "en",
    region: "intl",
    description:
      "X Engineering - timeline serving, real-time stream processing, recommendation systems",
  },
  {
    company: "Discord",
    url: "https://discord.com/category/engineering",
    altUrls: ["https://medium.com/discord-engineering"],
    domains: ["backend", "infrastructure", "data", "platform"],
    companyType: "social",
    language: "en",
    region: "intl",
    description:
      "Discord Engineering - real-time messaging at scale, Rust migration, Elixir, data storage",
  },
  {
    company: "Slack",
    url: "https://slack.engineering/",
    domains: ["backend", "frontend", "infrastructure", "platform"],
    companyType: "social",
    language: "en",
    region: "intl",
    description:
      "Slack Engineering - real-time messaging, Electron, API design, workspace architecture",
  },
  {
    company: "Pinterest",
    url: "https://medium.com/pinterest-engineering",
    domains: ["backend", "data", "ai-ml", "infrastructure", "mobile"],
    companyType: "social",
    language: "en",
    region: "intl",
    description:
      "Pinterest Engineering - visual search, recommendation, ads platform, content moderation",
  },

  // ── E-Commerce & Marketplace ──────────────────────────────────────────
  {
    company: "Shopify",
    url: "https://shopify.engineering/",
    domains: ["backend", "frontend", "infrastructure", "platform", "data"],
    companyType: "e-commerce",
    language: "en",
    region: "intl",
    description:
      "Shopify Engineering - commerce platform at scale, Ruby on Rails, React, flash sales",
  },

  // ── Fintech ───────────────────────────────────────────────────────────
  {
    company: "Stripe",
    url: "https://stripe.com/blog/engineering",
    domains: ["backend", "infrastructure", "frontend", "security", "platform"],
    companyType: "fintech",
    language: "en",
    region: "intl",
    description:
      "Stripe Engineering - payments infrastructure, API design, TypeScript migration, CI systems",
  },

  // ── Travel & Hospitality ──────────────────────────────────────────────
  {
    company: "Airbnb",
    url: "https://airbnb.tech/blog/",
    altUrls: ["https://medium.com/airbnb-engineering"],
    domains: ["frontend", "backend", "data", "ai-ml", "mobile"],
    companyType: "e-commerce",
    language: "en",
    region: "intl",
    description:
      "Airbnb Engineering & Data Science - search ranking, payments, design system, data pipelines",
  },

  // ── Mobility & Delivery ───────────────────────────────────────────────
  {
    company: "Uber",
    url: "https://www.uber.com/blog/engineering/",
    domains: ["backend", "data", "ai-ml", "infrastructure", "mobile"],
    companyType: "mobility",
    language: "en",
    region: "intl",
    description:
      "Uber Engineering - ride matching, maps, real-time pricing, data platform at petabyte scale",
  },
  {
    company: "Lyft",
    url: "https://eng.lyft.com/",
    domains: ["backend", "mobile", "data", "infrastructure"],
    companyType: "mobility",
    language: "en",
    region: "intl",
    description:
      "Lyft Engineering - rideshare platform, Kubernetes, autonomous vehicles, ML systems",
  },
  {
    company: "DoorDash",
    url: "https://careersatdoordash.com/engineering-blog/",
    altUrls: ["https://doordash.engineering/"],
    domains: ["backend", "data", "ai-ml", "infrastructure", "mobile"],
    companyType: "foodtech",
    language: "en",
    region: "intl",
    description:
      "DoorDash Engineering - delivery logistics, real-time dispatch, search/personalization",
  },
  {
    company: "Instacart",
    url: "https://tech.instacart.com/",
    domains: ["backend", "data", "ai-ml", "mobile"],
    companyType: "e-commerce",
    language: "en",
    region: "intl",
    description:
      "Instacart Tech - grocery delivery optimization, search ranking, fulfillment algorithms",
  },

  // ── Streaming & Entertainment ─────────────────────────────────────────
  {
    company: "Spotify",
    url: "https://engineering.atspotify.com/",
    domains: ["backend", "data", "ai-ml", "infrastructure", "platform"],
    companyType: "entertainment",
    language: "en",
    region: "intl",
    description:
      "Spotify Engineering - music recommendation, audio ML, Backstage developer portal",
  },

  // ── Infrastructure & Security ─────────────────────────────────────────
  {
    company: "Cloudflare",
    url: "https://blog.cloudflare.com/",
    domains: ["infrastructure", "security", "backend", "platform"],
    companyType: "cloud",
    language: "en",
    region: "intl",
    description:
      "Cloudflare Blog - CDN/edge computing, DDoS protection, Workers, internet performance",
  },
  {
    company: "Dropbox",
    url: "https://dropbox.tech/",
    domains: ["backend", "infrastructure", "data", "frontend"],
    companyType: "cloud",
    language: "en",
    region: "intl",
    description:
      "Dropbox Tech - file sync, Rust migration, distributed storage, desktop client engineering",
  },
];

// ---------------------------------------------------------------------------
// All blogs combined
// ---------------------------------------------------------------------------

export const ALL_TECH_BLOGS: TechBlog[] = [
  ...KOREAN_TECH_BLOGS,
  ...INTERNATIONAL_TECH_BLOGS,
];

// ---------------------------------------------------------------------------
// Notable Medium Engineering Publications (not company-specific)
// ---------------------------------------------------------------------------

export interface MediumPublication {
  name: string;
  url: string;
  focus: string;
}

export const MEDIUM_ENGINEERING_PUBLICATIONS: MediumPublication[] = [
  {
    name: "Better Programming",
    url: "https://betterprogramming.pub/",
    focus: "Tutorials, actionable advice, deep dives on software engineering",
  },
  {
    name: "Towards Data Science (TDS Archive)",
    url: "https://towardsdatascience.com/",
    focus:
      "Data science, data engineering, machine learning, AI — now independent from Medium",
  },
  {
    name: "Level Up Coding",
    url: "https://levelup.gitconnected.com/",
    focus:
      "Step-by-step guides, programming tips, best practices across languages",
  },
  {
    name: "CodeBurst",
    url: "https://codeburst.io/",
    focus: "Web development tutorials, JavaScript, Python, full-stack",
  },
  {
    name: "ITNEXT",
    url: "https://itnext.io/",
    focus: "DevOps, JavaScript, cloud-native, next-gen technologies",
  },
];

// ---------------------------------------------------------------------------
// Helper: Filter by domain
// ---------------------------------------------------------------------------

export function filterBlogsByDomain(domain: TechDomain): TechBlog[] {
  return ALL_TECH_BLOGS.filter((blog) => blog.domains.includes(domain));
}

// ---------------------------------------------------------------------------
// Helper: Filter by company type
// ---------------------------------------------------------------------------

export function filterBlogsByCompanyType(type: CompanyType): TechBlog[] {
  return ALL_TECH_BLOGS.filter((blog) => blog.companyType === type);
}

// ---------------------------------------------------------------------------
// Helper: Filter by region
// ---------------------------------------------------------------------------

export function filterBlogsByRegion(region: Region): TechBlog[] {
  return ALL_TECH_BLOGS.filter((blog) => blog.region === region);
}

// ---------------------------------------------------------------------------
// Category Maps (for organizing/display)
// ---------------------------------------------------------------------------

export const DOMAIN_LABELS: Record<TechDomain, string> = {
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  devops: "DevOps",
  data: "Data Engineering",
  "ai-ml": "AI / ML",
  infrastructure: "Infrastructure",
  security: "Security",
  "design-system": "Design System",
  "full-stack": "Full Stack",
  platform: "Platform",
  blockchain: "Blockchain",
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  "big-tech": "Big Tech",
  fintech: "Fintech",
  "e-commerce": "E-Commerce",
  social: "Social / Communication",
  mobility: "Mobility",
  entertainment: "Entertainment / Streaming",
  proptech: "PropTech",
  foodtech: "FoodTech / Delivery",
  gaming: "Gaming",
  cloud: "Cloud / Infrastructure",
  "developer-tools": "Developer Tools",
  enterprise: "Enterprise",
};

// ---------------------------------------------------------------------------
// Company name → logo slug mapping
// Keys match the `company` field in TechBlog entries.
// Slugs correspond to filenames in public/companies/{slug}.png
// ---------------------------------------------------------------------------

export const BLOG_COMPANY_SLUG_MAP: Record<string, string> = {
  // Korean - Big Tech
  Kakao: "kakao",
  "Kakao Pay": "kakaopay",
  "Kakao Bank": "kakaobank",
  Naver: "naver",
  "LY Corporation (LINE)": "line",
  Coupang: "coupang",
  Toss: "toss",
  "Woowa Brothers": "woowa",
  "Samsung SDS": "samsung-sds",
  "SK Planet": "sk-planet",
  NHN: "nhn",
  // Korean - Startups & Scale-ups
  Karrot: "daangn",
  Devsisters: "devsisters",
  Hyperconnect: "hyperconnect",
  Bucketplace: "bucketplace",
  SOCAR: "socar",
  Kurly: "kurly",
  Banksalad: "banksalad",
  RIDI: "ridi",
  WATCHA: "watcha",
  Yogiyo: "yogiyo",
  "29CM": "29cm",
  MUSINSA: "musinsa",
  Zigbang: "zigbang",
  // International
  Meta: "meta",
  Google: "google",
  Netflix: "netflix",
  AWS: "aws",
  GitHub: "github",
  LinkedIn: "linkedin",
  "X (Twitter)": "x",
  Discord: "discord",
  Slack: "slack",
  Pinterest: "pinterest",
  Shopify: "shopify",
  Stripe: "stripe",
  Airbnb: "airbnb",
  Uber: "uber",
  Lyft: "lyft",
  DoorDash: "doordash",
  Instacart: "instacart",
  Spotify: "spotify",
  Cloudflare: "cloudflare",
  Dropbox: "dropbox",
};

/** Get the logo slug for a blog company name */
export function getBlogCompanySlug(companyName: string): string {
  return (
    BLOG_COMPANY_SLUG_MAP[companyName] ||
    companyName.toLowerCase().replace(/\s+/g, "-")
  );
}
