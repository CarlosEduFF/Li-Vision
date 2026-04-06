package com.LiVision

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageFormat
import android.graphics.Rect
import android.graphics.YuvImage
import android.media.Image
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.io.ByteArrayOutputStream

class HandLandmarkerPlugin(
    proxy: VisionCameraProxy,
    options: Map<String, Any>?
) : FrameProcessorPlugin() {

    companion object {
        private const val TAG = "HandLandmarkerPlugin"
    }

    private var handLandmarker: HandLandmarker? = null
    private var initError: String? = null

    init {
        try {
            Log.d(TAG, "=== INICIALIZANDO HandLandmarkerPlugin ===")
            val context = proxy.context
            Log.d(TAG, "Context obtido: ${context.javaClass.simpleName}")

            val baseOptions = BaseOptions.builder()
                .setModelAssetPath("hand_landmarker.task")
                .build()

            val landmarkerOptions = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.IMAGE)
                .setNumHands(2)
                .setMinHandDetectionConfidence(0.4f)
                .setMinHandPresenceConfidence(0.4f)
                .setMinTrackingConfidence(0.4f)
                .build()

            handLandmarker = HandLandmarker.createFromOptions(context, landmarkerOptions)
            Log.d(TAG, "=== HandLandmarker CRIADO COM SUCESSO ===")
        } catch (e: Exception) {
            initError = e.message
            Log.e(TAG, "=== ERRO AO INICIALIZAR HandLandmarker ===", e)
        }
    }

    override fun callback(frame: Frame, params: Map<String, Any>?): Any? {
        if (handLandmarker == null) {
            Log.e(TAG, "HandLandmarker nulo! Erro: $initError")
            return hashMapOf<String, Any>(
                "hands" to emptyList<Any>(),
                "error" to (initError ?: "HandLandmarker não inicializado")
            )
        }

        try {
            val mediaImage: Image = frame.image
            val width = mediaImage.width
            val height = mediaImage.height
            val format = mediaImage.format

            Log.d(TAG, "Frame: ${width}x${height}, format=$format, orientation=${frame.orientation}")

            val bitmap = imageToBitmap(mediaImage)
            if (bitmap == null) {
                Log.e(TAG, "Conversão Image->Bitmap falhou (format=$format)")
                return hashMapOf<String, Any>(
                    "hands" to emptyList<Any>(),
                    "error" to "Falha na conversão Image->Bitmap"
                )
            }

            Log.d(TAG, "Bitmap: ${bitmap.width}x${bitmap.height}")

            val mpImage: MPImage = BitmapImageBuilder(bitmap).build()
            val result = handLandmarker!!.detect(mpImage)
            bitmap.recycle()

            val numHands = result.landmarks().size
            Log.d(TAG, "Detecção: $numHands mão(s)")

            if (numHands == 0) {
                return hashMapOf<String, Any>("hands" to emptyList<Any>())
            }

            val handsArray = mutableListOf<List<Map<String, Double>>>()
            for ((handIdx, hand) in result.landmarks().withIndex()) {
                val points = mutableListOf<Map<String, Double>>()
                for ((lmIdx, landmark) in hand.withIndex()) {
                    points.add(hashMapOf(
                        "x" to landmark.x().toDouble(),
                        "y" to landmark.y().toDouble(),
                        "z" to landmark.z().toDouble()
                    ))
                    if (lmIdx == 0 || lmIdx == 8) {
                        Log.d(TAG, "  Mão[$handIdx] Lm[$lmIdx]: x=${landmark.x()}, y=${landmark.y()}")
                    }
                }
                handsArray.add(points)
            }

            return hashMapOf<String, Any>("hands" to handsArray)
        } catch (e: Exception) {
            Log.e(TAG, "ERRO no callback", e)
            return hashMapOf<String, Any>(
                "hands" to emptyList<Any>(),
                "error" to (e.message ?: "Erro desconhecido")
            )
        }
    }

    private fun imageToBitmap(image: Image): Bitmap? {
        return when (image.format) {
            ImageFormat.YUV_420_888 -> yuvToBitmap(image)
            ImageFormat.JPEG -> jpegToBitmap(image)
            else -> yuvToBitmap(image)
        }
    }

    private fun yuvToBitmap(image: Image): Bitmap? {
        try {
            val width = image.width
            val height = image.height
            val yPlane = image.planes[0]
            val uPlane = image.planes[1]
            val vPlane = image.planes[2]
            val yBuffer = yPlane.buffer
            val uBuffer = uPlane.buffer
            val vBuffer = vPlane.buffer

            yBuffer.rewind()
            uBuffer.rewind()
            vBuffer.rewind()

            val yRowStride = yPlane.rowStride
            val uvRowStride = uPlane.rowStride
            val uvPixelStride = uPlane.pixelStride

            val nv21 = ByteArray(width * height * 3 / 2)

            if (yRowStride == width) {
                yBuffer.get(nv21, 0, width * height)
            } else {
                for (row in 0 until height) {
                    yBuffer.position(row * yRowStride)
                    yBuffer.get(nv21, row * width, width)
                }
            }

            val uvHeight = height / 2
            val uvWidth = width / 2
            var nv21Offset = width * height

            for (row in 0 until uvHeight) {
                for (col in 0 until uvWidth) {
                    val uvIndex = row * uvRowStride + col * uvPixelStride
                    vBuffer.position(uvIndex)
                    nv21[nv21Offset++] = vBuffer.get()
                    uBuffer.position(uvIndex)
                    nv21[nv21Offset++] = uBuffer.get()
                }
            }

            val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
            val outStream = ByteArrayOutputStream()
            yuvImage.compressToJpeg(Rect(0, 0, width, height), 85, outStream)
            val jpegBytes = outStream.toByteArray()

            return BitmapFactory.decodeByteArray(jpegBytes, 0, jpegBytes.size,
                BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 })
        } catch (e: Exception) {
            Log.e(TAG, "Erro YUV->Bitmap", e)
            return null
        }
    }

    private fun jpegToBitmap(image: Image): Bitmap? {
        val buffer = image.planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }
}
