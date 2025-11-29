/**
 * 图片压缩工具
 * 用于压缩用户上传的图片，减少内存占用
 */

export interface CompressedImage {
  dataUrl: string;
  size: number; // 压缩后大小（字节）
  originalSize: number; // 原始大小（字节）
  compressionRatio: number; // 压缩比例
}

/**
 * 压缩图片
 * @param file 图片文件
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 压缩质量 (0-1)
 * @returns Promise<CompressedImage>
 */
export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<CompressedImage> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 计算压缩后的尺寸
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // 设置canvas尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为dataURL
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const compressedSize = blob.size;
                const originalSize = file.size;
                const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

                resolve({
                  dataUrl: reader.result as string,
                  size: compressedSize,
                  originalSize,
                  compressionRatio,
                });
              };
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('图片压缩失败'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 压缩聊天背景图（更小的尺寸和更高的压缩率）
 */
export const compressChatBackground = (file: File): Promise<CompressedImage> => {
  return compressImage(file, 1280, 720, 0.6);
};
