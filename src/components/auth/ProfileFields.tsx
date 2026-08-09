"use client";

/**
 * What an account tells us about the person behind it, beyond a credential.
 *
 * SHARED BY BOTH SIGN-UP SURFACES, and that is the point of the file. These
 * fields existed only in `AuthModal` while the standalone `/signin` page asked
 * for a name, an address and a password and nothing else — so the moment the
 * nav started pointing at the page, the main way to create an account stopped
 * collecting any of it. One component means adding a field adds it everywhere.
 *
 * NOTHING HERE IS OPTIONAL ANY MORE. Age, occupation and location are the only
 * inputs to the cross-tabs, and a cross-tab built from whoever felt like
 * answering is worse than no cross-tab: it looks like a measurement and is a
 * self-selected sample. The rules live in `lib/auth/signup.ts`; this file
 * renders them and shows what failed.
 *
 * STATE IS PICKED, NOT TYPED, for India. "Karnataka", "karnataka" and "KA" are
 * three different rows in a geo breakdown, and free text guarantees all three
 * exist. The list is the same place registry the topics and polls use, so an
 * account's state and an artifact's state are the same string by construction.
 */

import { Select, type SelectOption } from "@/components/ui/Select";
import { AuthField, authInput } from "@/components/auth/CredentialForm";
import type { DetailErrors } from "@/lib/auth/signup";
import { COUNTRIES, OCCUPATIONS } from "@/lib/demographics";
import { PLACES } from "@/lib/places";

// Re-exported so existing imports keep working. The lists themselves moved to
// `lib/demographics.ts`, where the database seed can also read them — see the
// note at the top of that file.
export { COUNTRIES, OCCUPATIONS };

/** The demographic half of an account. Keys match `Profile` exactly. */
export interface ProfileDetails {
  dob?: string;
  mobile?: string;
  occupation?: string;
  country?: string;
  state?: string;
  city?: string;
}

const asOptions = (values: readonly string[]): SelectOption[] =>
  values.map((value) => ({ value, label: value }));

/**
 * India's states, from the one registry.
 *
 * "Prefer not to say" is kept out of the occupation list's *effect* rather than
 * its wording — somebody choosing it has answered, and their row is simply not
 * counted into an occupation breakdown. Refusing to let them proceed would be
 * demanding an answer to the one question people most reasonably decline.
 */
const INDIAN_STATES: SelectOption[] = PLACES.filter(
  (place) => place.level === "state" && place.parent === "india",
).map((place) => ({ value: place.label, label: place.label }));

export function ProfileFields({
  value,
  onChange,
  errors = {},
  columns = 2,
}: {
  value: ProfileDetails;
  onChange: (next: ProfileDetails) => void;
  errors?: DetailErrors;
  /** 1 on the narrow page panel, 2 in the wider sheet. */
  columns?: 1 | 2;
}) {
  const set = <K extends keyof ProfileDetails>(key: K, next: ProfileDetails[K]) =>
    onChange({ ...value, [key]: next });

  const inIndia = value.country === "India";

  return (
    <div className={columns === 2 ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "flex flex-col gap-4"}>
      <AuthField label="Date of birth" required error={errors.dob}>
        <input
          type="date"
          value={value.dob ?? ""}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set("dob", e.target.value)}
          aria-invalid={Boolean(errors.dob) || undefined}
          className={`${authInput} ${errors.dob ? "border-negative/55" : ""}`}
        />
      </AuthField>

      <AuthField label="Mobile number" required error={errors.mobile}>
        <input
          type="tel"
          inputMode="tel"
          value={value.mobile ?? ""}
          onChange={(e) => set("mobile", e.target.value)}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          aria-invalid={Boolean(errors.mobile) || undefined}
          className={`${authInput} ${errors.mobile ? "border-negative/55" : ""}`}
        />
      </AuthField>

      <AuthField label="Occupation" required error={errors.occupation} htmlFor="ohq-occupation">
        <Select
          id="ohq-occupation"
          value={value.occupation ?? ""}
          onChange={(next) => set("occupation", next)}
          options={asOptions(OCCUPATIONS)}
          ariaLabel="Occupation"
          invalid={Boolean(errors.occupation)}
        />
      </AuthField>

      <AuthField label="Country" required error={errors.country} htmlFor="ohq-country">
        <Select
          id="ohq-country"
          value={value.country ?? ""}
          onChange={(next) =>
            // Changing country clears a state picked from the old country's
            // list, so "United States / Karnataka" can never be submitted.
            onChange({ ...value, country: next, state: next === value.country ? value.state : "" })
          }
          options={asOptions(COUNTRIES)}
          ariaLabel="Country"
          invalid={Boolean(errors.country)}
        />
      </AuthField>

      <AuthField label="State" required error={errors.state} htmlFor="ohq-state">
        {inIndia ? (
          <Select
            id="ohq-state"
            value={value.state ?? ""}
            onChange={(next) => set("state", next)}
            options={INDIAN_STATES}
            placeholder="Select your state"
            ariaLabel="State"
            invalid={Boolean(errors.state)}
          />
        ) : (
          <input
            id="ohq-state"
            value={value.state ?? ""}
            onChange={(e) => set("state", e.target.value)}
            placeholder="State or province"
            autoComplete="address-level1"
            aria-invalid={Boolean(errors.state) || undefined}
            className={`${authInput} ${errors.state ? "border-negative/55" : ""}`}
          />
        )}
      </AuthField>

      <AuthField label="City" required error={errors.city}>
        <input
          value={value.city ?? ""}
          onChange={(e) => set("city", e.target.value)}
          placeholder="e.g. Bengaluru"
          autoComplete="address-level2"
          aria-invalid={Boolean(errors.city) || undefined}
          className={`${authInput} ${errors.city ? "border-negative/55" : ""}`}
        />
      </AuthField>
    </div>
  );
}

/**
 * Why the fields are required, and what happens to them.
 *
 * Shown next to the fields rather than behind a link, because a claim about
 * what you will do with somebody's date of birth is only worth anything at the
 * moment they are deciding whether to type it.
 */
export function ProfilePrivacyNote() {
  return (
    <p className="m-0 rounded-[12px] border border-veil/10 bg-veil/3 p-3.5 text-[12px] leading-[1.6] text-dim">
      <strong className="font-semibold text-soft">This is what the breakdowns are made of.</strong>{" "}
      Every dashboard reports how a split moved by region, age and occupation, and
      those rows are read from exactly these fields — which is why they are asked
      for rather than left optional. None of it is ever shown against your name:
      it appears inside aggregate percentages, and a group is withheld entirely
      until enough people have shared theirs. Your email and mobile number are
      never shown to anyone.
      <span className="mt-1.5 block text-dim/80">
        These are stored against your account, not in this browser. You can change
        them later, and deleting your account deletes them with it.
      </span>
    </p>
  );
}
