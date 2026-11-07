/-!
Software Constitution abstract proof obligations.
These theorems prove properties of the MODEL, not equivalence to JS/Rust
implementations. The adapter binding proof to production remains separate.
-/
namespace SoftwareConstitution

inductive Level where
  | l0 | l1 | l2 | l3 | l4
  deriving DecidableEq, Repr

structure Preconditions where
  structural : Prop
  sixGates : Prop
  authenticatedAudit : Prop
  platformBijection : Prop

def eligible (p : Preconditions) : Level → Prop
  | .l0 => True
  | .l1 => p.structural
  | .l2 => p.structural ∧ p.sixGates
  | .l3 => p.structural ∧ p.sixGates ∧ p.authenticatedAudit
  | .l4 => p.structural ∧ p.sixGates ∧ p.authenticatedAudit ∧ p.platformBijection

theorem l4_implies_l3 (p : Preconditions) :
    eligible p .l4 → eligible p .l3 := by
  intro h
  exact ⟨h.1, h.2.1, h.2.2.1⟩

theorem l3_implies_l2 (p : Preconditions) :
    eligible p .l3 → eligible p .l2 := by
  intro h
  exact ⟨h.1, h.2.1⟩

theorem no_l2_without_all_gates (p : Preconditions) (h : ¬ p.sixGates) :
    ¬ eligible p .l2 := by
  intro e
  exact h e.2

structure ReleaseRequirements where
  policyApproved : Prop
  authorityGranted : Prop
  commitEvidenceBound : Prop

def releaseAllowed (r : ReleaseRequirements) : Prop :=
  r.policyApproved ∧ r.authorityGranted ∧ r.commitEvidenceBound

theorem no_release_without_authority (r : ReleaseRequirements)
    (h : ¬ r.authorityGranted) : ¬ releaseAllowed r := by
  intro e
  exact h e.2.1

theorem no_release_without_evidence (r : ReleaseRequirements)
    (h : ¬ r.commitEvidenceBound) : ¬ releaseAllowed r := by
  intro e
  exact h e.2.2

end SoftwareConstitution
