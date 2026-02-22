# Implementation Plan for Customizable Suggestion Criteria

## Feature Description

The feature "Customizable Suggestion Criteria" aims to allow users to define and customize criteria for generating suggestions. This flexibility allows the tool to adapt to different project needs and user preferences. The implementation involves both frontend and backend changes to facilitate the creation, application, and storage of custom criteria.

## Source Files to Modify or Create

1. **Backend Modification:**
   - Modify `backend/app/services/suggestion_service.py`

2. **Frontend Modifications:**
   - Modify `frontend/src/components/modals/AddFeatureFlow.tsx`
   - Modify `frontend/src/components/panels/SuggestionPanel.tsx`

## Detailed Instructions

### 1. Backend Modifications

#### File: `backend/app/services/suggestion_service.py`

- **Import Statements**: Ensure the following import is present
  ```python
  from typing import List, Dict
  ```

- **Modify Function:** Update or create a function in `SuggestionService` to handle custom criteria.
  ```python
  def generate_suggestions_with_criteria(self, criteria: Dict[str, any]) -> List[str]:
      # Use the criteria to filter or adjust the suggestion generation logic
      suggestions = []
      # Example: pseudo-logic to adjust filtering
      for suggestion in self.all_suggestions():
          if self.meets_criteria(suggestion, criteria):
              suggestions.append(suggestion)
      return suggestions

  def meets_criteria(self, suggestion: str, criteria: Dict[str, any]) -> bool:
      # Implement custom filtering logic
      return True  # Placeholder for actual logic
  ```

### 2. Frontend Modifications

#### File: `frontend/src/components/modals/AddFeatureFlow.tsx`

- **Modify Component:** Add a form or input fields to capture custom criteria from the user.
  ```tsx
  import { useState } from 'react';

  const AddFeatureFlow = () => {
      const [criteria, setCriteria] = useState({});

      const handleCriteriaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value } = event.target;
          setCriteria({ ...criteria, [name]: value });
      };

      return (
          <div>
              <input type="text" name="criterion1" onChange={handleCriteriaChange} />
              <input type="text" name="criterion2" onChange={handleCriteriaChange} />
          </div>
      );
  };
  ```

#### File: `frontend/src/components/panels/SuggestionPanel.tsx`

- **Modify Component:** Update the component to use the custom criteria when fetching suggestions.
  ```tsx
  import { useEffect, useState } from 'react';
  import { generateSuggestionsWithCriteria } from '../../services/api';

  const SuggestionPanel = ({ criteria }) => {
      const [suggestions, setSuggestions] = useState([]);

      useEffect(() => {
          generateSuggestionsWithCriteria(criteria).then(setSuggestions);
      }, [criteria]);

      return (
          <div>
              {suggestions.map((suggestion, index) => (
                  <div key={index}>{suggestion}</div>
              ))}
          </div>
      );
  };
  ```

## Verification Step
- Run the following test to verify the implementation:
  ```shell
  npm test __tests__/customizable-suggestion-criteria.test.ts
  ```

## Constraints
- Do not modify `.env`, CI configs, or deployment configs.

This plan outlines the necessary steps to implement the feature, including modifications to existing services and components and the introduction of new logic for handling customizable criteria. Follow each step precisely to ensure the feature is implemented as intended.