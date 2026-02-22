# Implementation Plan for Customizable Suggestion Criteria

## Feature Description
The goal is to enable users to customize the criteria for suggestion generation, allowing the tool to be more adaptable to different project requirements and user preferences. This will involve both backend and frontend changes.

## Source Files to Modify

1. **Backend**
   - `backend/app/services/suggestion_service.py`
   - `backend/app/schemas/features.py`

2. **Frontend**
   - `frontend/src/components/modals/AddFeatureFlow.tsx`
   - `frontend/src/components/panels/SuggestionPanel.tsx`

## Backend Changes

### Modify `suggestion_service.py`

- **File**: `backend/app/services/suggestion_service.py`
  
  Add a new method to handle custom suggestion criteria:
  
  ```python
  def generate_suggestions_with_criteria(self, criteria: dict):
      """
      Generate suggestions based on custom criteria.

      :param criteria: A dictionary of criteria to customize suggestions
      :return: A list of suggestions
      """
      # Logic to apply custom criteria
      # This is a placeholder implementation
      suggestions = self.base_suggestions()
      customized_suggestions = [s for s in suggestions if s.meets_criteria(criteria)]
      return customized_suggestions
  ```

### Modify `features.py`

- **File**: `backend/app/schemas/features.py`

  Add a new schema for custom suggestion criteria:

  ```python
  from pydantic import BaseModel

  class SuggestionCriteria(BaseModel):
      # Define customizable criteria fields
      priority: str
      complexity: str
      tags: list[str]
  ```

## Frontend Changes

### Modify `AddFeatureFlow.tsx`

- **File**: `frontend/src/components/modals/AddFeatureFlow.tsx`

  Add a UI component to capture custom suggestion criteria:
  
  ```tsx
  import React, { useState } from 'react';

  export const AddFeatureFlow = () => {
      const [criteria, setCriteria] = useState({ priority: '', complexity: '', tags: [] });

      const handleCriteriaChange = (e) => {
          const { name, value } = e.target;
          setCriteria(prev => ({ ...prev, [name]: value }));
      };

      return (
          <div>
              {/* Existing UI components */}
              <div>
                  <label>Priority: </label>
                  <input name="priority" value={criteria.priority} onChange={handleCriteriaChange} />
              </div>
              <div>
                  <label>Complexity: </label>
                  <input name="complexity" value={criteria.complexity} onChange={handleCriteriaChange} />
              </div>
              <div>
                  <label>Tags: </label>
                  <input name="tags" value={criteria.tags.join(',')} onChange={handleCriteriaChange} />
              </div>
          </div>
      );
  };
  ```

### Modify `SuggestionPanel.tsx`

- **File**: `frontend/src/components/panels/SuggestionPanel.tsx`

  Modify the component to apply custom criteria for suggestions:
  
  ```tsx
  import { useEffect, useState } from 'react';
  import api from '../../services/api';

  export const SuggestionPanel = ({ criteria }) => {
      const [suggestions, setSuggestions] = useState([]);

      useEffect(() => {
          api.fetchSuggestionsWithCriteria(criteria).then(setSuggestions);
      }, [criteria]);

      return (
          <div>
              {/* Render suggestions */}
              {suggestions.map(suggestion => (
                  <div key={suggestion.id}>{suggestion.text}</div>
              ))}
          </div>
      );
  };
  ```

## Final Verification Step
Run the test file to confirm the implementation:

```sh
run jest __tests__/customizable-suggestion-criteria.test.ts
```

## Constraints
- Do not modify `.env`, CI configs, or deployment configs.
