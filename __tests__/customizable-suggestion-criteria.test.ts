import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AddFeatureFlow } from '../frontend/src/components/modals/AddFeatureFlow';
import { SuggestionPanel } from '../frontend/src/components/panels/SuggestionPanel';

// Mock API service
jest.mock('../frontend/src/services/api', () => ({
  fetchSuggestionsWithCriteria: jest.fn().mockResolvedValue([
    { id: '1', text: 'Suggestion 1' },
    { id: '2', text: 'Suggestion 2' },
  ]),
}));

describe('Customizable Suggestion Criteria', () => {
  test('UI for setting custom suggestion criteria', () => {
    render(<AddFeatureFlow />);

    // Check for input fields
    const priorityInput = screen.getByLabelText(/priority/i);
    const complexityInput = screen.getByLabelText(/complexity/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    expect(priorityInput).toBeInTheDocument();
    expect(complexityInput).toBeInTheDocument();
    expect(tagsInput).toBeInTheDocument();

    // Simulate input change
    fireEvent.change(priorityInput, { target: { value: 'High' } });
    fireEvent.change(complexityInput, { target: { value: 'Medium' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1,tag2' } });

    expect(priorityInput.value).toBe('High');
    expect(complexityInput.value).toBe('Medium');
    expect(tagsInput.value).toBe('tag1,tag2');
  });

  test('Backend processing of customized criteria', async () => {
    render(<SuggestionPanel criteria={{ priority: 'High', complexity: 'Medium', tags: ['tag1', 'tag2'] }} />);

    const suggestions = await screen.findAllByText(/Suggestion/);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toHaveTextContent('Suggestion 1');
    expect(suggestions[1]).toHaveTextContent('Suggestion 2');
  });
});
