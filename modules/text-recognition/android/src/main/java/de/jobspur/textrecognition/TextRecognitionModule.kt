package de.jobspur.textrecognition

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Erkennt Text auf einem Bild mit Google ML Kit, komplett auf dem Gerät.
 *
 * Gibt die Zeilen in Lesereihenfolge zurück, jeweils mit Position und Höhe.
 * Die Höhe hilft in JavaScript zu erraten, was Überschrift ist (meist die Stelle).
 */
class TextRecognitionModule : Module() {
  private val recognizer by lazy {
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }

  override fun definition() = ModuleDefinition {
    Name("JobspurTextRecognition")

    AsyncFunction("recognizeAsync") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("ERR_IMAGE", "Das Bild ließ sich nicht öffnen", e)
        null
      } ?: return@AsyncFunction

      recognizer.process(image)
        .addOnSuccessListener { result ->
          val lines = result.textBlocks.flatMapIndexed { blockIndex, block ->
            block.lines.map { line ->
              val box = line.boundingBox
              mapOf(
                "text" to line.text,
                "block" to blockIndex,
                "top" to (box?.top ?: 0),
                "left" to (box?.left ?: 0),
                "height" to (box?.height() ?: 0),
              )
            }
          }
          promise.resolve(mapOf("width" to image.width, "height" to image.height, "lines" to lines))
        }
        .addOnFailureListener { e ->
          promise.reject("ERR_TEXT_RECOGNITION", "Texterkennung fehlgeschlagen", e)
        }
      // Das Ergebnis kommt über promise, nicht als Rückgabewert.
      Unit
    }

    OnDestroy {
      recognizer.close()
    }
  }
}
