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
        // 释放 object URL 内存
        URL.revokeObjectURL(img.src);

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
        // 释放 object URL 内存
        URL.revokeObjectURL(img.src);
        reject(new Error('图片加载失败'));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 批量压缩图片
 * @param files 图片文件列表 (FileList | File[])
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 压缩质量 (0-1)
 * @returns Promise<CompressedImage[]>
 */
export const compressImages = async (
  files: FileList | File[],
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<CompressedImage[]> => {
  const fileArray = Array.from(files);
  return Promise.all(
    fileArray.map(file => compressImage(file, maxWidth, maxHeight, quality))
  );
};
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

/**
 * 裁剪并压缩头像图片（自动居中裁剪为正方形）
 * @param file 图片文件
 * @param size 目标边长（像素），默认 200px
 * @param quality 压缩质量，默认 0.8
 */
export const cropAndCompressAvatar = (
  file: File,
  size: number = 200,
  quality: number = 0.8
): Promise<CompressedImage> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 释放 object URL 内存，关键修复！
        URL.revokeObjectURL(img.src);

        // 1. 计算居中裁剪区域
        let sourceX = 0;
        let sourceY = 0;
        let sourceSize = 0;

        if (img.width > img.height) {
          // 宽图：取中间的正方形
          sourceSize = img.height;
          sourceX = (img.width - img.height) / 2;
          sourceY = 0;
        } else {
          // 长图：取中间的正方形
          sourceSize = img.width;
          sourceX = 0;
          sourceY = (img.height - img.width) / 2;
        }

        // 2. 设置目标 Canvas 尺寸（固定为正方形）
        canvas.width = size;
        canvas.height = size;

        // 3. 绘制并裁剪
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx?.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

        // 4. 导出压缩后的 Base64
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
              reject(new Error('头像裁剪失败'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        // 释放 object URL 内存
        URL.revokeObjectURL(img.src);
        reject(new Error('头像加载失败'));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};
