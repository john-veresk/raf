Retrospective on this planning session

  What happened
                                                                                                       
  We went through roughly four iterations before landing on the final plan:                            
                                                                                                       
  1. Exploration 1 — found overlay files and thumbnail layers. Planned "Option A": apply a 4pt         
  view-space inset at render time + inflate collision checks by 4pt. Wrote a large, complex plan       
  touching 7 files with elaborate handle-offset math, scaled-thumbnail math, and collision inflation.  
  2. User asked a conceptual question — "is visible vs actual border a thing? what is hit area?" This  
  pushed me to present Options A/B/C. User chose C.                                                    
  3. Exploration 2 (triggered by C) — traced lasso → selection.bounds → link.bounds flow, and          
  discovered that LassoSelector.tightBoundsPadding = 5 and                                             
  SelectionOperations.calculateTightBounds(padding: 5) already bake 5pt of padding into every stored   
  link and header at creation time today. The original task 1 premise ("border sits flush against      
  strokes, feels visually tight") was factually wrong about the current state.                         
  4. Replanning — collapsed everything to a 4-file change: one constant, one default-param swap, one   
  callsite swap, version bump. Plus a CLI e2e test.                                                    
                                                                                                       
  The final plan is ~10% the size of the first draft and does strictly more (affects CLI, e2e-tested,  
  fewer moving parts). The ~90% I threw away came from accepting a wrong premise about current         
  behavior.                                                                                            
                                                                                                       
  Root cause                                                                                         
                                                                                                       
  I planned a change without verifying the premise in the code first. Task 1's description said borders
   sit flush against strokes. I took it at face value and designed a mechanism to add padding where    
  there wasn't any. The mechanism was correct for the world I imagined. It was wrong for the world that
   actually exists. Every downstream question — margin size, thumbnail scaling, resize-handle offsets, 
  collision inflation, the Option A vs B vs C framing itself — was downstream of that unverified     
  premise.

  Prompt instructions that would have short-circuited this
                                                                                                       
  Add these to the planner prompt, ordered by impact:                                                  
                                                                                                       
  1. Trace the lifecycle before designing a mechanism.                                                 
                                                                                                       
  ▎ Before proposing any new mechanism (new constant, new inset, new validation layer, new code path), 
  trace the full lifecycle of the field or value your task affects:                                    
  ▎ - Creation — where is it first computed and from what inputs?                                      
  ▎ - Storage — where is it persisted? What transformations happen on the write path?                  
  ▎ - Consumption — who reads it? List every consumer, not just the one the user mentioned.            
                                                                                                       
  ▎ Do this exploration in parallel with (not after) the "find relevant files" pass. Only after the    
  lifecycle is on paper should you propose changes.                                                    
                                                                                                       
  This alone would have forced me to find tightBoundsPadding = 5 in the first exploration.             
                                                                                                       
  2. Verify stated premises against the code.                                                          
                                                                                                       
  ▎ When a task description makes a factual claim about current behavior (e.g., "borders sit flush     
  against strokes", "X is hardcoded", "Y is not yet implemented"), do not accept it. Open the code and 
  verify. If the claim contradicts what you see, surface the contradiction to the user BEFORE planning 
  any changes. The user's mental model of the code may be stale or incomplete — your job is to         
  reconcile it, not to ratify it.                                                                    
                                                                                                       
  3. Look for existing knobs before adding new ones.                                                   
                                                                                                       
  ▎ Before adding a new constant, new layer, or new validation, search for existing mechanisms that    
  already do something similar to what the task asks for. Prefer tuning an existing knob over adding   
  new machinery. The question to ask is: "Does the behavior the user wants already exist in some form, 
  just with a different value?" If yes, the task is probably to change the value (or consolidate       
  duplicate definitions of it), not to add a new system.                                             

  4. Ask the architectural question first, tactical questions second.
                                                                                                       
  ▎ In the interview, start with the foundational architectural question, not with tactical details.   
  For a "add X to Y" task, the foundational questions are:                                             
  ▎ - What is the current state of X? (verified against code)                                          
  ▎ - Is X best expressed as (a) a rendering effect, (b) a validation effect, (c) a baked-in stored    
  value, or (d) something else? What are the trade-offs?                                               
                                                                                                       
  ▎ Only after these are answered should you ask tactical questions like "what value?" or "which       
  files?" Tactical questions built on an unexamined architectural assumption produce plans that        
  collapse when the assumption collapses.                                                              
                                                                                                       
  5. Cap the blast radius of the first-draft plan.                                                     
                                                                                                       
  ▎ Your first draft plan should be as lean as possible — minimum files, minimum constants, minimum new
   mechanisms. If the draft touches more than ~5 files or introduces more than one new concept, pause  
  and ask whether there is a smaller change that achieves the same outcome. Elaborate plans early are  
  expensive to revise when the architecture pivots.                                                    
                                                                                                       
  6. When the project has a CLI / platform-agnostic core, explore it in the first pass.                
                                                                                                       
  ▎ If CLAUDE.md or equivalent documents a platform-agnostic core package and/or a CLI that must stay  
  in sync with the main app, include the core package and the CLI in your first exploration pass — not 
  as a follow-up after the user mentions them. Any change to shared code (models, operations,          
  validation) implicitly affects the CLI. Discovering this late forces a replan.                       
                                                                                                       
  7. Plans are not essays. Cut history and counter-explanations.                                       
                                                                                                       
  ▎ Plan files are instructions for an executor, not a narrative. Do not:                              
  ▎ - Recap history ("we previously tried X, then Y, and now...")                                      
  ▎ - Justify what the plan does NOT do ("we are not adding a render-time inset because...")           
  ▎ - Explain the abandoned alternatives                                                               
                                                                                                       
  ▎ State what is to be done, why (briefly, only if the why drives judgment calls during execution),   
  and how. One of each.                                                                                
                                                                                                       
  8. Verify premise → architecture → tactics, in that order, before the interview.                     
                                                                                                       
  ▎ The correct order of operations is:                                                                
  ▎ 1. Read the task description                                                                       
  ▎ 2. Explore and trace lifecycle (parallel sub-tasks)                                                
  ▎ 3. Reconcile the description with what the code shows. Surface any contradiction.                  
  ▎ 4. Present the architectural choice (if there is one) with trade-offs                              
  ▎ 5. Interview on the tactical details that remain                                                   
  ▎ 6. Draft plan                                                                                      
  ▎ 7. Self-critique → revise → write                                                                  
                                                                                                       
  ▎ If you are writing a plan draft before step 3 is complete, you are planning in a fiction.          
                                                                                                       
  Specific textual addition that would have saved the most time                                        
                                                                                                       
  If I had to add exactly one sentence to the planning prompt, it would be this:                       
                                                                                                       
  ▎ Before writing any plan, open the code that produces, stores, and consumes the field your task     
  affects — and explicitly write out the value you see there today. If the task description contradicts
   what you find, stop and reconcile with the user before proceeding.                                  
                                                                                                       
  Applied to this session: I would have opened LassoSelector.swift, seen tightBoundsPadding: CGFloat = 
  5, opened CreateLinkUseCase.swift, seen sourceLink.bounds = selection.bounds, and realized within the
   first 5 minutes that the task is "raise 5 to 10" — not "add a new padding mechanism." The Options   
  A/B/C framing, the handle-offset math, the thumbnail scaling math, the collision inflation, and the  
  two separate plan files would never have been written.

---
let's take lessons from this retrospective. analyze exsiting plna/amend prompts and give me options
to improve. i want prompt to be more lean, more about instructions / less history, less rigit so
agent have a freedom to solve the task on their own in something wrong in the plan or not mentioned
(not all files mentioned), rely on strengths of agent what they can discover nessesary info from the
codebase themselves and focus on requirenments, clarity, clean solution, pointing to right direction
