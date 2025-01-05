export function getCustomizedStyles(element: HTMLElement) {
    // Get computed styles for the element
    const computedStyles = element.ownerDocument.defaultView!.getComputedStyle(element);

    // Create a temporary default element of the same type
    const defaultElement = element.ownerDocument.createElement(element.tagName);
    element.ownerDocument.body.appendChild(defaultElement);
    const defaultStyles = element.ownerDocument.defaultView!.getComputedStyle(defaultElement);

    // Compare computed styles with default styles
    const customizedStyles: Record<string, string> = {};
    for (let property of computedStyles) {
        if (['transform-origin', 'width', 'height', 'perspective-origin', 'inline-size', 'block-size'].includes(property)) continue;
        const computedValue = computedStyles.getPropertyValue(property);
        const defaultValue = defaultStyles.getPropertyValue(property);

        // Add to customized styles if the value differs
        if (computedValue !== defaultValue) {
            customizedStyles[property] = computedValue;
        }
    }

    // Remove the temporary element
    element.ownerDocument.body.removeChild(defaultElement);

    return customizedStyles;
}
