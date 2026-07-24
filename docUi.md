# CASE Delivery — Customer Home Screen Redesign Prompt

You are a **Principal Product Designer**, **Senior Mobile UX Designer**, and **Staff React Native Engineer** (Uber Eats / DoorDash / Blinkit / Zepto / Apple / Airbnb caliber).

Do **NOT** explain the plan — implement immediately.

---

## Product (do not invent a different app)

**CASE Delivery** — campus quick commerce for **CASE Jamaica** (Blinkit-style multi-vertical, not food-only).

| Constraint | Value |
|---|---|
| Brand | CASE Delivery |
| Primary | `#FF5A00` — never purple gradients / cream-serif AI clichés |
| Surfaces | White / soft grey `#F6F6F6` |
| Ink / muted | `#0F0F0F` / `#6F6F6F` |
| Currency | **J$** / JMD everywhere (never $ alone) |
| Typography | Plus Jakarta Sans (in app) |
| Verticals | Food · Grocery · Pharmacy · Store · Get Anything |
| Delivery model | Campus **delivery points** (not street address / pin) |
| Wallet | Campus wallet balance in header |
| Stack | Expo RN · Reanimated · Expo Image · existing Case hooks |
| Tokens | Extend `CaseUi` in `MyApp/src/constants/caseUi.ts` |

**Scope:** Customer **Home ONLY**

- Primary: `MyApp/src/app/(tabs)/index.tsx`
- Related: `shop-card.tsx`, `product-card.tsx`, `skeleton.tsx` / `HomeSkeleton`, `floating-cart-bar.tsx`, `caseHome.ts`, `caseUi.ts`

Do **NOT** touch: backend, APIs, auth, cart rules, other tabs, restaurant detail, checkout, admin, merchant portal.

**Preserve behavior:** delivery-point picker, wallet nav, notifications + unread badge, profile avatar, search → `/search`, category → browse, shop/product open, Get Anything, floating cart, pull-to-refresh, merchant filters by `businessType`.

---

## Quality bar

Win the first **3 seconds**: premium, modern, fast, minimal, elegant, international, delightful.

Benchmark quality (never clone UI): Blinkit · Zepto · Uber Eats · DoorDash · Talabat · Careem · Deliveroo · Airbnb.

Ship-ready for a global store listing as CASE Jamaica’s public home.

---

## Sections (CASE-specific)

### 1. Header
- Time-aware greeting: “Good morning/afternoon/evening, {firstName from fullName}”
- Avatar → profile
- **Deliver to** {campus delivery point} + chevron (CASE language)
- Soft ETA line (“~20 mins delivery”)
- Wallet pill with **J$** balance
- Bell + unread badge when count > 0
- Orange → white hero wash; clear hierarchy; 44pt+ targets

### 2. Search
- Large premium field → `/search`
- Placeholder covering food, grocery, pharmacy, stores
- Search icon + mic (voice future-ready, non-blocking)
- Soft shadow, large radius, press feedback

### 3. Categories (horizontal)
Order: **All · Food · Grocery · Pharmacy · Store · Anything**  
Rounded image tiles, selected orange ring, spring press, short labels from `CASE_HOME_CATEGORY_ROW`.

### 4. Promo carousel
Auto-slide campus offers (e.g. free delivery above **J$500**, pharmacy, grocery).  
Pagination dots, smooth scroll, strong CTA that filters category / navigates.

### 5. Popular near you
Premium shop cards: cover/logo, rating chip, mins, open/closed, heart, min order / offer when available.

### 6. Popular products
Horizontal Apple-quality cards: image, name, store, rating/meta, **J$** price, discount, **ADD** (existing add-to-cart).

### 7. Vertical strips
- Restaurants — list cards  
- Groceries — horizontal  
- Pharmacy — compact  
- Stores — as needed  

Filter by `businessType`; empty strips omit or collapse cleanly.

### 8. Get Anything
Warm campus custom-request CTA; primary orange action.

### 9. Floating cart
Polish `FloatingCartBar` only — **J$** total, item count, restaurant name, smooth show/hide.

### 10. Motion, loading, empty
- Reanimated: fade / scale / spring, staggered entrance, ~60fps, subtle not noisy  
- `HomeSkeleton` / shimmer while merchants load — never blank white  
- Premium empty: no shops near campus + helpful CTA (refresh / change delivery point)

---

## Design system

- Typography scale, spacing 4/8 rhythm, radii from `CaseUi.radius`
- Elevation: `softShadow` / `cardShadow` / `liftShadow` (orange glow sparingly)
- No Inter/Roboto defaults, no cluttered pill clusters, no card soup in the hero
- One-handed friendly; accessible contrast; Android + iPhone

---

## Performance

No janky lists; avoid useless re-renders; keep scroll fluid; memo heavy cards where already patterned.

---

## Done when

1. Feels like CASE campus commerce — not a generic food template  
2. Every section is intentional and polished  
3. All prior Home functionality still works  
4. Would you ship this as CASE Jamaica’s App Store home screenshot? If no — keep refining **Home only**
