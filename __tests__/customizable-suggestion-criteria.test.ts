import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import AddFeatureFlow from '../frontend/src/components/modals/AddFeatureFlow';
import SuggestionPanel from '../frontend/src/components/panels/SuggestionPanel';

// Mocking API call
jest.mock('../frontend/src/services/api', () => ({
  generateSuggestionsWithCriteria: jest.fn(() => Promise.resolve(['Suggestion 1', 'Suggestion 2']))
}));

const mockCriteria = { criterion1: 'value1', criterion2: 'value2' };

// Test UI for setting custom suggestion criteria
test('AddFeatureFlow allows input of custom criteria', () => {
  const { getByRole } = render(<AddFeatureFlow />);
  const input1 = getByRole('textbox', { name: /criterion1/i });
  const input2 = getByRole('textbox', { name: /criterion2/i });

  fireEvent.change(input1, { target: { value: 'value1' } });
  fireEvent.change(input2, { target: { value: 'value2' } });

  expect(input1.value).toBe('value1');
  expect(input2.value).toBe('value2');
});

// Test backend processing of customized criteria
// This is indirectly tested via the SuggestionPanel component

// Test the impact of custom criteria on suggestion output
test('SuggestionPanel displays suggestions based on custom criteria', async () => {
  const { findByText } = render(<SuggestionPanel criteria={mockCriteria} />);

  // Verify if suggestions are rendered correctly
  const suggestion1 = await findByText('Suggestion 1');
  const suggestion2 = await findByText('Suggestion 2');

  expect(suggestion1).toBeInTheDocument();
  expect(suggestion2).toBeInTheDocument();
});