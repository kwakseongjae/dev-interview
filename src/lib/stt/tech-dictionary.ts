// Applied rules: js-index-maps, js-early-exit

/**
 * Tech Dictionary for STT post-processing
 *
 * Maps Korean phonetic representations of tech terms to their correct English forms.
 * Only includes UNAMBIGUOUS terms — excludes short/ambiguous words like
 * "뷰" (Vue vs view), "자바" (Java vs coffee), "키" (key vs height), "셋" (Set vs three).
 */

const TECH_TERMS: ReadonlyArray<readonly [string, string]> = [
  // React hooks
  ["리액트", "React"],
  ["유즈스테이트", "useState"],
  ["유즈이펙트", "useEffect"],
  ["유즈메모", "useMemo"],
  ["유즈콜백", "useCallback"],
  ["유즈리듀서", "useReducer"],
  ["유즈레프", "useRef"],
  ["유즈컨텍스트", "useContext"],
  ["유즈트랜지션", "useTransition"],

  // Frameworks & Languages
  ["넥스트제이에스", "Next.js"],
  ["넥스트", "Next.js"],
  ["타입스크립트", "TypeScript"],
  ["자바스크립트", "JavaScript"],
  ["노드제이에스", "Node.js"],
  ["파이썬", "Python"],
  ["코틀린", "Kotlin"],
  ["스위프트", "Swift"],
  ["러스트", "Rust"],
  ["고랭", "Go"],
  ["플러터", "Flutter"],
  ["앵귤러", "Angular"],
  ["스벨트", "Svelte"],
  ["리액트네이티브", "React Native"],

  // State Management
  ["리덕스", "Redux"],
  ["주스탄드", "Zustand"],
  ["리코일", "Recoil"],
  ["조타이", "Jotai"],
  ["몹엑스", "MobX"],
  ["탄스택쿼리", "TanStack Query"],
  ["리액트쿼리", "React Query"],

  // Build Tools & Infra
  ["도커", "Docker"],
  ["쿠버네티스", "Kubernetes"],
  ["깃허브", "GitHub"],
  ["깃랩", "GitLab"],
  ["웹팩", "Webpack"],
  ["이에스린트", "ESLint"],
  ["프리티어", "Prettier"],
  ["바이트", "Vite"],
  ["터보팩", "Turbopack"],
  ["롤업", "Rollup"],
  ["바벨", "Babel"],
  ["젠킨스", "Jenkins"],
  ["테라폼", "Terraform"],
  ["엔진엑스", "Nginx"],
  ["아파치", "Apache"],
  ["버셀", "Vercel"],
  ["네틀리파이", "Netlify"],

  // Databases
  ["포스트그레스", "PostgreSQL"],
  ["몽고디비", "MongoDB"],
  ["수파베이스", "Supabase"],
  ["파이어베이스", "Firebase"],
  ["프리즈마", "Prisma"],
  ["마이에스큐엘", "MySQL"],
  ["레디스", "Redis"],
  ["다이나모디비", "DynamoDB"],
  ["카산드라", "Cassandra"],

  // CS Concepts
  ["디스트럭처링", "destructuring"],
  ["호이스팅", "hoisting"],
  ["프로토타입", "prototype"],
  ["미들웨어", "middleware"],
  ["엔드포인트", "endpoint"],
  ["그래프큐엘", "GraphQL"],
  ["웹소켓", "WebSocket"],
  ["클로저", "closure"],
  ["프로미스", "Promise"],
  ["어싱크어웨이트", "async/await"],
  ["이벤트루프", "event loop"],
  ["콜백함수", "callback"],
  ["이터레이터", "iterator"],
  ["제너레이터", "generator"],
  ["데코레이터", "decorator"],
  ["인터페이스", "interface"],
  ["제네릭", "generic"],
  ["폴리모피즘", "polymorphism"],
  ["인캡슐레이션", "encapsulation"],
  ["싱글톤", "singleton"],
  ["옵저버", "observer"],
  ["팩토리패턴", "factory pattern"],
  ["디자인패턴", "design pattern"],

  // Testing
  ["제스트", "Jest"],
  ["사이프레스", "Cypress"],
  ["플레이라이트", "Playwright"],
  ["바이테스트", "Vitest"],
  ["스토리북", "Storybook"],

  // APIs & Protocols
  ["레스트에이피아이", "REST API"],
  ["레스트풀", "RESTful"],
  ["에이치티티피", "HTTP"],
  ["에이치티티피에스", "HTTPS"],
  ["에이피아이", "API"],
  ["시에스에스", "CSS"],
  ["에이치티엠엘", "HTML"],
  ["돔", "DOM"],
  ["에스에스알", "SSR"],
  ["에스에스지", "SSG"],
  ["아이에스알", "ISR"],
  ["시에스알", "CSR"],
  ["서버사이드렌더링", "server-side rendering"],
  ["클라이언트사이드렌더링", "client-side rendering"],

  // Cloud / AWS
  ["에이더블유에스", "AWS"],
  ["이씨투", "EC2"],
  ["에스쓰리", "S3"],
  ["람다", "Lambda"],
  ["클라우드프론트", "CloudFront"],
  ["지씨피", "GCP"],
  ["애저", "Azure"],

  // Auth & Security
  ["오어스", "OAuth"],
  ["제이더블유티", "JWT"],
  ["세션토큰", "session token"],
  ["크로스사이트스크립팅", "XSS"],
  ["시에스알에프", "CSRF"],
  ["코어스", "CORS"],
] as const;

// Build a Map sorted by key length (longest first) to handle overlapping terms
const sortedTerms = [...TECH_TERMS].sort((a, b) => b[0].length - a[0].length);

/**
 * Corrects Korean phonetic tech terms in transcribed text to their proper English forms.
 * Processes longer terms first to avoid partial replacements.
 */
export function correctTechTerms(text: string): string {
  if (!text) return text;

  let result = text;
  for (const [korean, english] of sortedTerms) {
    if (result.includes(korean)) {
      result = result.replaceAll(korean, english);
    }
  }
  return result;
}

/**
 * Returns the number of tech terms in the dictionary.
 */
export function getTechTermCount(): number {
  return TECH_TERMS.length;
}
