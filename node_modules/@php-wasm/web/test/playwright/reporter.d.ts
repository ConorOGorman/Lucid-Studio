import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
export default class implements Reporter {
    private currentFile;
    onTestBegin(test: TestCase): void;
    onTestEnd(test: TestCase, result: TestResult): void;
}
