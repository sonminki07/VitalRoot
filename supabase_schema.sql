-- ==============================================================================
-- 2026 관광데이터 활용 공모전: 만성질환자 맞춤형 웰니스 헬스케어 관광 플랫폼 (VitalRoot)
-- Supabase 초기 스키마 및 시드 데이터 설정 SQL
-- Supabase 대시보드 -> SQL Editor 에서 전체 복사 후 [Run]을 실행하세요.
-- ==============================================================================

-- 1. UUID 확장 기능 활성화
create extension if not exists "uuid-ossp";

-- 2. 사용자 건강 프로필 테이블 (듀얼 프로파일링)
create table if not exists public.user_profiles (
    id uuid default uuid_generate_v4() primary key,
    user_name text not null default '웰니스 여행자',
    chronic_conditions text[] default array['당뇨', '고혈압']::text[], -- 기저질환 (당뇨, 고혈압, 이상지질혈증 등)
    allergies text[] default array[]::text[],                          -- 알레르기 유발 식품
    dietary_preference text default '저염/저탄수',                     -- 선호 식단 성향
    condition_today text default '최상 (가벼운 산책 선호)',            -- 당일 주관적 컨디션
    recolored_zones integer default 0,                                -- 퀘스트를 통해 채워진 색칠 구역 수
    created_at timestamp with time zone default now()
);

-- 3. 웰니스 안심 장소 및 코스 테이블 (안심식당 + 힐링 산책로)
create table if not exists public.wellness_places (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    category text not null check (category in ('안심식당', '산책로', '로컬제휴처')),
    description text,
    address text,
    latitude double precision not null,
    longitude double precision not null,
    safe_tags text[] default array[]::text[],       -- 예: ['저염식', 'GI지수 낮음', '휠체어/완경사']
    health_benefit text,                            -- 건강 기대 효과
    tour_api_content_id text,                       -- 한국관광공사 Tour API 연계 ID
    is_major_route boolean default false,
    created_at timestamp with time zone default now()
);

-- 4. 퀘스트 및 로컬 보상(쿠폰) 테이블
create table if not exists public.user_quests (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    restaurant_name text not null,
    trail_name text not null,
    reward_coupon_name text not null,
    reward_barcode text not null,
    is_completed boolean default false,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- 5. RLS (Row Level Security) 설정 및 공개 조회 정책 허용
alter table public.user_profiles enable row level security;
alter table public.wellness_places enable row level security;
alter table public.user_quests enable row level security;

-- 익명 사용자(Anon) 읽기/쓰기 허용 정책 (공모전 및 프로토타입용)
create policy "Allow public read user_profiles" on public.user_profiles for select using (true);
create policy "Allow public insert user_profiles" on public.user_profiles for insert with check (true);
create policy "Allow public update user_profiles" on public.user_profiles for update using (true);

create policy "Allow public read wellness_places" on public.wellness_places for select using (true);
create policy "Allow public read user_quests" on public.user_quests for select using (true);
create policy "Allow public update user_quests" on public.user_quests for update using (true);

-- 6. 초기 시드 데이터 삽입 (한국관광공사 Tour API 연계형 대표 웰니스 코스 3선)
insert into public.wellness_places (name, category, description, address, latitude, longitude, safe_tags, health_benefit, tour_api_content_id, is_major_route)
values 
('소담한 자연밥상', '안심식당', '유기농 저염 나물밥상 및 찰현미 약선 요리 전문점', '서울특별시 중구 소파로 83', 37.5583, 126.9825, array['저염안심', '당뇨케어', '친환경식재료'], '식후 급격한 혈당 상승 방지 및 칼륨 보충', 'FD010100_01', true),
('남산 힐링 소나무 자락길', '산책로', '경사도 5% 미만의 휠체어/시니어 완만 무장애 힐링 코스', '서울특별시 중구 회현동 남산공원 자락길', 37.5545, 126.9850, array['완경사', '무장애', '심폐활력'], '식후 30분 보행으로 인슐린 감수성 개선', 'C010100_01', true),
('도심속 풀향기 건강식당', '안심식당', '염도 0.5% 이하 기준 조리 인증 건강식당 (메밀 웰빙 면요리)', '서울특별시 용산구 이태원로 29', 37.5348, 126.9942, array['저염인증', '고혈압안심', '천연조미료'], '혈관 내 삼투압 안정 및 나트륨 배출 유도', 'FD010200_02', false),
('용산가족공원 호수 둘레길', '산책로', '평지 중심의 그늘막과 벤치가 충분한 회복 산책로', '서울특별시 용산구 서빙고로 185', 37.5242, 126.9805, array['평지산책', '휴게시설완비'], '안정적인 심박수 유지 및 스트레스 해소', 'C010200_02', false),
('한옥 채움 약선당', '안심식당', '당뇨 환우를 위한 버섯 전골 및 발효 보리밥 정식', '서울특별시 종로구 북촌로 42', 37.5815, 126.9855, array['저당식단', '복합탄수화물'], '혈당 스파이크 예방 및 소화 촉진', 'FD010100_03', true),
('삼청공원 숲속 무장애 데크길', '산책로', '피톤치드 풍부한 데크 완보 산책로', '서울특별시 종로구 삼청로 156', 37.5890, 126.9840, array['숲속피톤치드', '완만경사'], '유산소 대사 촉진 및 혈압 강하', 'C010300_03', true)
on conflict do nothing;

insert into public.user_quests (title, restaurant_name, trail_name, reward_coupon_name, reward_barcode, is_completed)
values
('남산 코스: 안심식사 + 소나무길 완주', '소담한 자연밥상', '남산 힐링 소나무 자락길', '로컬 웰니스 유기농 음료 50% 할인권', 'WELLNESS-2026-NAMSAN-8891', true),
('용산 코스: 저염 메밀식 + 호수 산책', '도심속 풀향기 건강식당', '용산가족공원 호수 둘레길', '로컬 친환경 마켓 5,000원 이용권', 'WELLNESS-2026-YONGSAN-4512', false),
('북촌 코스: 약선 보리밥 + 숲속 데크길', '한옥 채움 약선당', '삼청공원 숲속 무장애 데크길', '북촌 전통 찻집 무가당 차 1잔 교환권', 'WELLNESS-2026-BUKCHON-9903', false)
on conflict do nothing;
