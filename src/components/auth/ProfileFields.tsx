"use client";

/**
 * What an account tells us about the person behind it, beyond a credential.
 *
 * SHARED BY BOTH SIGN-UP SURFACES, and that is the point of the file. These
 * fields existed only in `AuthModal` while the standalone `/signin` page asked
 * for a name, an address and a password and nothing else — so the moment the
 * nav started pointing at the page, the main way to create an account stopped
 * collecting any of it. Two forms, one of them forgotten. One component means
 * adding a field adds it everywhere.
 *
 * EVERY FIELD HERE IS OPTIONAL, and the reason is asked rather than assumed:
 * these are what make a cross-tab possible. A topic dashboard reporting how
 * 17–20s split against over-31s, or how Karnataka split against Kerala, is
 * reading exactly this — and nothing else on the product produces it. So the
 * step explains what it buys instead of labelling six boxes "Optional" and
 * hoping.
 *
 * Nothing here is ever displayed against a name. `derive.ts` reports these as
 * percentages and withholds a row entirely below a reporting threshold, which
 * is the promise the copy below is allowed to make.
 */

import { AuthField, authInput } from "@/components/auth/CredentialForm";

/** The optional half of an account. Keys match `Profile` exactly. */
export interface ProfileDetails {
  dob?: string;
  mobile?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
}

export const OCCUPATIONS = [
  "Student",
  "Working professional",
  "Self-employed or business owner",
  "Parent or guardian",
  "Educator",
  "Retired",
  "Prefer not to say",
];

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Singapore",
  "Other",
];

export function ProfileFields({
  value,
  onChange,
  columns = 2,
}: {
  value: ProfileDetails;
  onChange: (next: ProfileDetails) => void;
  /** 1 on the narrow page panel, 2 in the wider sheet. */
  columns?: 1 | 2;
}) {
  const set = <K extends keyof ProfileDetails>(key: K, next: ProfileDetails[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className={columns === 2 ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : "flex flex-col gap-3"}>
      <AuthField label="Date of birth" hint="Optional">
        <input
          type="date"
          value={value.dob ?? ""}
          onChange={(e) => set("dob", e.target.value)}
          className={authInput}
        />
      </AuthField>

      <AuthField label="Mobile number" hint="Optional">
        <input
          type="tel"
          inputMode="tel"
          value={value.mobile ?? ""}
          onChange={(e) => set("mobile", e.target.value)}
          placeholder="+91 ·········"
          autoComplete="tel"
          className={authInput}
        />
      </AuthField>

      <AuthField label="Occupation" hint="Optional">
        <select
          value={value.occupation ?? ""}
          onChange={(e) => set("occupation", e.target.value)}
          className={authInput}
        >
          <option value="">Select…</option>
          {OCCUPATIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </AuthField>

      <AuthField label="Country" hint="Optional">
        <select
          value={value.country ?? ""}
          onChange={(e) => set("country", e.target.value)}
          className={authInput}
        >
          <option value="">Select…</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </AuthField>

      <AuthField label="State" hint="Optional">
        <input
          value={value.state ?? ""}
          onChange={(e) => set("state", e.target.value)}
          placeholder="e.g. Karnataka"
          autoComplete="address-level1"
          className={authInput}
        />
      </AuthField>

      <AuthField label="City" hint="Optional">
        <input
          value={value.city ?? ""}
          onChange={(e) => set("city", e.target.value)}
          placeholder="e.g. Bengaluru"
          autoComplete="address-level2"
          className={authInput}
        />
      </AuthField>
    </div>
  );
}

/**
 * Why the fields are worth filling in, and what happens to them.
 *
 * Shown next to the fields rather than behind a link, because a claim about
 * what you will do with somebody's date of birth is only worth anything at the
 * moment they are deciding whether to type it.
 */
export function ProfilePrivacyNote() {
  return (
    <p className="m-0 rounded-[12px] border border-veil/10 bg-veil/3 p-3.5 text-[12px] leading-[1.6] text-dim">
      <strong className="font-semibold text-soft">This is what the breakdowns are made of.</strong>{" "}
      Every dashboard reports how the split moved by region, age and occupation —
      and it can only do that if people answer this. None of it is ever shown
      against your name: it appears inside aggregate percentages, and a group is
      withheld entirely until enough people have shared theirs. Your email and
      mobile number are never shown to anyone.
      <span className="mt-1.5 block text-dim/80">
        In this prototype nothing is transmitted anywhere — details stay in this
        browser&rsquo;s local storage until you clear it.
      </span>
    </p>
  );
}
