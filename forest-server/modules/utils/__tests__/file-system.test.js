import { jest } from '@jest/globals';

// Mock the fs/promises module before importing our utility
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockAccess = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    access: mockAccess,
  },
}));

// Mock the path module
const mockDirname = jest.fn();
const mockJoin = jest.fn();

jest.unstable_mockModule('path', () => ({
  default: {
    dirname: mockDirname,
    join: mockJoin,
  },
}));

// Now import our utility
const { FileSystem } = await import('../file-system.js');

describe('FileSystem Utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('readFile', () => {
    test('should read a JSON file and parse it', async () => {
      const mockData = { key: 'value' };
      mockReadFile.mockResolvedValue(JSON.stringify(mockData));

      const data = await FileSystem.readJSON('dummy/path.json');

      expect(data).toEqual(mockData);
      expect(mockReadFile).toHaveBeenCalledWith('dummy/path.json', 'utf8');
    });

    test('should read a file successfully', async () => {
      const mockContent = 'file content';
      mockReadFile.mockResolvedValue(mockContent);

      const result = await FileSystem.readFile('test.txt');

      expect(result).toBe(mockContent);
      expect(mockReadFile).toHaveBeenCalledWith('test.txt', 'utf8');
    });

    test('should throw error when file read fails', async () => {
      const mockError = new Error('File not found');
      mockReadFile.mockRejectedValue(mockError);

      await expect(FileSystem.readFile('nonexistent.txt')).rejects.toThrow(
        'Failed to read file nonexistent.txt: File not found'
      );

      expect(mockReadFile).toHaveBeenCalledWith('nonexistent.txt', 'utf8');
    });
  });

  describe('writeFile', () => {
    test('should write file successfully', async () => {
      mockWriteFile.mockResolvedValue(undefined);

      await FileSystem.writeFile('test.txt', 'content');

      expect(mockWriteFile).toHaveBeenCalledWith('test.txt', 'content', 'utf8');
    });

    test('should throw error when file write fails', async () => {
      const mockError = new Error('Permission denied');
      mockWriteFile.mockRejectedValue(mockError);

      await expect(FileSystem.writeFile('readonly.txt', 'content')).rejects.toThrow(
        'Failed to write file readonly.txt: Permission denied'
      );
    });
  });

  describe('exists', () => {
    test('should return true when file exists', async () => {
      mockAccess.mockResolvedValue(undefined);

      const result = await FileSystem.exists('existing.txt');

      expect(result).toBe(true);
      expect(mockAccess).toHaveBeenCalledWith('existing.txt');
    });

    test('should return false when file does not exist', async () => {
      mockAccess.mockRejectedValue(new Error('ENOENT'));

      const result = await FileSystem.exists('nonexistent.txt');

      expect(result).toBe(false);
      expect(mockAccess).toHaveBeenCalledWith('nonexistent.txt');
    });
  });

  describe('writeJSON', () => {
    test('should write JSON file with default formatting', async () => {
      const mockData = { key: 'value', number: 42 };
      const expectedJSON = JSON.stringify(mockData, null, 2);
      mockWriteFile.mockResolvedValue(undefined);

      await FileSystem.writeJSON('output.json', mockData);

      expect(mockWriteFile).toHaveBeenCalledWith('output.json', expectedJSON, 'utf8');
    });

    test('should throw error when serialization fails', async () => {
      const circularObj = {};
      circularObj.self = circularObj; // Create circular reference

      await expect(FileSystem.writeJSON('circular.json', circularObj)).rejects.toThrow(
        'Failed to serialize JSON for circular.json:'
      );
    });
  });

  describe('path utilities', () => {
    test('dirname should call path.dirname', () => {
      mockDirname.mockReturnValue('/some/directory');

      const result = FileSystem.dirname('/some/directory/file.txt');

      expect(result).toBe('/some/directory');
      expect(mockDirname).toHaveBeenCalledWith('/some/directory/file.txt');
    });

    test('join should call path.join', () => {
      mockJoin.mockReturnValue('/combined/path');

      const result = FileSystem.join('/base', 'sub', 'file.txt');

      expect(result).toBe('/combined/path');
      expect(mockJoin).toHaveBeenCalledWith('/base', 'sub', 'file.txt');
    });
  });
});
