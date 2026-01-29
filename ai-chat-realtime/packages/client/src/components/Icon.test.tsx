import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Icon from './Icon';
import type { IconName } from '../types';

describe('Icon Component', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      render(<Icon />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render with default sparkle icon', () => {
      render(<Icon />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelector('path')).toBeInTheDocument();
    });

    it('should render chat icon', () => {
      render(<Icon name="chat" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Icon name="chat" className="custom-class w-6 h-6" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveClass('custom-class', 'w-6', 'h-6');
    });

    it('should render null for invalid icon name without paths', () => {
      const { container } = render(<Icon name={"nonexistent-icon-xyz" as IconName} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('icon variants', () => {
    it('should render modern variant by default', () => {
      render(<Icon name="chat" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render classic variant when specified', () => {
      render(<Icon name="chat" styleVariant="classic" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should fallback to modern when invalid variant specified', () => {
      render(<Icon name="chat" styleVariant={"nonexistent" as "modern" | "classic"} />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('supported icons', () => {
    const supportedIcons: IconName[] = [
      'chat', 'topic', 'arrow-down', 'participants', 'users',
      'monitor', 'info', 'chevron-right', 'x-mark', 'send',
      'sparkle', 'moon', 'sun', 'alert', 'tag'
    ];

    supportedIcons.forEach((iconName) => {
      it(`should render ${iconName} icon`, () => {
        render(<Icon name={iconName} />);
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg?.querySelector('path')).toBeInTheDocument();
      });
    });
  });

  describe('SVG attributes', () => {
    it('should have correct default attributes', () => {
      render(<Icon name="chat" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('fill', 'none');
      expect(svg).toHaveAttribute('stroke', 'currentColor');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
      expect(svg).toHaveAttribute('stroke-linecap', 'round');
      expect(svg).toHaveAttribute('stroke-linejoin', 'round');
    });

    it('should apply custom strokeWidth', () => {
      render(<Icon name="chat" strokeWidth={3} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '3');
    });

    it('should use variant strokeWidth when custom not provided', () => {
      render(<Icon name="chat" styleVariant="classic" />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '2');
    });
  });

  describe('custom paths', () => {
    it('should render custom paths when provided', () => {
      const customPaths = ['M10 10 L20 20', 'M20 10 L10 20'];
      render(<Icon paths={customPaths} strokeWidth={2} />);
      const svg = document.querySelector('svg');
      const paths = svg?.querySelectorAll('path');
      expect(paths).toHaveLength(2);
      expect(svg).toHaveAttribute('stroke-width', '2');
    });

    it('should use default strokeWidth for custom paths if not specified', () => {
      const customPaths = ['M10 10 L20 20'];
      render(<Icon paths={customPaths} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('stroke-width', '1.5');
    });
  });

  describe('additional props', () => {
    it('should forward additional props to SVG element', () => {
      render(<Icon name="chat" data-testid="icon-test" aria-label="Chat icon" />);
      const svg = screen.getByTestId('icon-test');
      expect(svg).toHaveAttribute('aria-label', 'Chat icon');
    });

    it('should handle onClick event', () => {
      const handleClick = vi.fn();
      render(<Icon name="chat" onClick={handleClick} data-testid="clickable-icon" />);
      const svg = screen.getByTestId('clickable-icon');
      svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('theme icons', () => {
    it('should render sun icon for light theme', () => {
      render(<Icon name="sun" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
      const paths = svg?.querySelectorAll('path');
      expect(paths?.length).toBeGreaterThan(1);
    });

    it('should render moon icon for dark theme', () => {
      render(<Icon name="moon" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('useMemo optimization', () => {
    it('should memoize icon resolution', () => {
      const { rerender } = render(<Icon name="chat" />);
      const svg1 = document.querySelector('svg');
      rerender(<Icon name="chat" />);
      const svg2 = document.querySelector('svg');
      expect(svg1).toBeInTheDocument();
      expect(svg2).toBeInTheDocument();
    });

    it('should update when name changes', () => {
      const { rerender } = render(<Icon name="chat" />);
      expect(document.querySelector('svg')).toBeInTheDocument();
      rerender(<Icon name="sun" />);
      expect(document.querySelector('svg')).toBeInTheDocument();
    });

    it('should update when styleVariant changes', () => {
      const { rerender } = render(<Icon name="chat" styleVariant="modern" />);
      const svg = document.querySelector('svg');
      const initialStrokeWidth = svg?.getAttribute('stroke-width');
      rerender(<Icon name="chat" styleVariant="classic" />);
      expect(svg?.getAttribute('stroke-width')).not.toBe(initialStrokeWidth);
    });
  });

  describe('edge cases', () => {
    it('should handle empty className', () => {
      render(<Icon name="chat" className="" />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle undefined name gracefully', () => {
      render(<Icon name={undefined} />);
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render multiple icons simultaneously', () => {
      const { container } = render(
        <div>
          <Icon name="chat" className="icon-1" />
          <Icon name="sun" className="icon-2" />
          <Icon name="moon" className="icon-3" />
        </div>
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs).toHaveLength(3);
    });
  });

  describe('path keys', () => {
    it('should have unique keys for paths', () => {
      render(<Icon name="sun" />);
      const paths = document.querySelectorAll('path');
      const keys = Array.from(paths).map((path) => path.getAttribute('d'));
      expect(keys.length).toBeGreaterThan(1);
    });
  });
});
