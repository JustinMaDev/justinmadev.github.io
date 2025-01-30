---
layout: post
title: "The Big Four of C++20: Coroutine"
---

In the previous blog, we introduced C++20 modules. This article dives into C++20 coroutines through three executable examples. The content is divided into three parts: the first part conceptually discusses the differences between coroutines and regular functions; the second part presents two complete coroutine code examples and delves into the compiler level, providing an in-depth analysis of `promise_type` and its workflow; the third part explains the purpose and working principles of `co_await`, which is the most challenging section to understand.

![](/assets/images/20211019_1.png)  
<!--more-->  

### What Are C++ Coroutines?  

1. **Syntactic Perspective**: Any function containing `co_await`, `co_yield`, or `co_return` becomes a coroutine.  
2. **System Perspective**: Coroutines are code blocks running in **threads** that can be paused/resumed, enabling **single-threaded asynchrony** - fundamentally different from multi-threaded asynchrony.  
>   - Thread suspension involves OS-managed context switching with stack preservation.  
>   - Coroutine suspension is lightweight, preserving execution state without CPU resource release.  
3. **Execution Flow**:  
>   - Regular functions: `invoke → finalize`  
>   - Coroutines: `invoke → suspend ↔ resume → finalize`  


In a non-coroutine scenario, when calling a function within the same thread, execution always starts from the first line of the function. The only way for execution to return to the caller is through `return` (ignoring exceptions). After a function returns, if it is called again, execution will always restart from the first line.

In the case of coroutines, calling a coroutine function allows it to suspend and resume multiple times. A coroutine can suspend itself using `co_yield` while returning a value to the caller. When resumed, execution continues from the statement immediately following the last suspension instead of restarting from the beginning.

When suspending a coroutine, it needs to save its execution state, including internal variable values.  
**Where is this information stored?**  
**Who is responsible for saving and restoring it?**  
A coroutine can return multiple values to its caller.  
**How are these "return values" transmitted?**  
(Non-coroutine functions return values using the `return` mechanism, often placing them in registers such as `eax`.)

With these three fundamental questions in mind, let's formally explore the world of C++20 coroutines.

---

### Coroutine Frame, `promise_type`, `future_type`, and `coroutine_handle`  

**Key Principles**:  
1. C++20 coroutines have **no scheduler** - suspension/resumption is managed by compiler-injected code.  
2. C++20 provides coroutine **mechanics**, not a library - developers build libraries atop these.  

**Coroutine Keywords**:  
> * `co_yield value`: Suspends coroutine, returns `value` to caller  
> * `co_await awaitable`: Suspends if `awaitable` isn't ready  
> * `co_return value`: Terminates coroutine, returns `value`  

---

#### Example 1: Minimal Coroutine (No Return Value)  
*(Compiler: x86-64 GCC (coroutines) on [Godbolt](https://godbolt.org/))*  

```cpp
#include <iostream>
#include <coroutine>

struct future_type {
    struct promise_type;
    using co_handle_type = std::coroutine_handle<promise_type>;

    struct promise_type {
        promise_type() { std::cout << "promise_type constructor\n"; }
        ~promise_type() { std::cout << "promise_type destructor\n"; }

        auto get_return_object() { 
            std::cout << "get_return_object\n"; 
            return co_handle_type::from_promise(*this); 
        }
        auto initial_suspend() { 
            std::cout << "initial_suspend\n"; 
            return std::suspend_always(); 
        }
        auto final_suspend() noexcept { 
            std::cout << "final_suspend\n"; 
            return std::suspend_always(); 
        }
        void return_void() { std::cout << "return_void\n"; }
        void unhandled_exception() { std::terminate(); }
    };
    
    future_type(co_handle_type co_handle) : co_handle_(co_handle) {
        std::cout << "future_type constructor\n";
    }
    ~future_type() { 
        std::cout << "future_type destructor\n"; 
        co_handle_.destroy(); 
    }

    bool resume() { 
        if (!co_handle_.done()) co_handle_.resume(); 
        return !co_handle_.done();
    }

private:
    co_handle_type co_handle_;
};

future_type three_step_coroutine() {
    std::cout << "three_step_coroutine begin\n";
    co_await std::suspend_always();
    std::cout << "three_step_coroutine running\n";
    co_await std::suspend_always();
    std::cout << "three_step_coroutine end\n";
}

int main() {
    future_type ret = three_step_coroutine(); 
    ret.resume();  // First resume
    ret.resume();  // Second resume
    ret.resume();  // Third resume
    return 0;
}
```
The output:
```cpp
promise_type constructor
get_return_object
initial_suspend
future_type constructor
=======calling first resume======
three_step_coroutine begin
=======calling second resume=====
three_step_coroutine running
=======calling third resume======
three_step_coroutine end
return_void
final_suspend
=======main end======
future_type destructor
promise_type destructor
```
# C++20 Coroutine Execution: Breaking Traditional Assumptions

Let's temporarily ignore the seemingly complex `future_type` and `promise_type` structures and start from the `main` function. The very first line of code completely differs from pre-coroutine-era code.

**From a traditional perspective:**
1. `three_step_coroutine` appears to be a function (with `()`, return value, and code blocks)  
2. `ret` seems like a return value of `three_step_coroutine` with type `future_type`  
3. After line 1 executes, `ret` being returned implies `three_step_coroutine` has finished execution  

**In the coroutine era, all these assumptions are completely invalid:**
1. `three_step_coroutine` is **not a function** - it's a coroutine! (contains `co_await` in body)  
2. `ret` is **not a return value** - it's the coroutine object manager (stores coroutine state)  
3. After line 1 completes, **not a single line** of `three_step_coroutine`'s body has executed!  

# C++20 Coroutine Execution Flow

Let's examine the execution sequence after `main` starts, ignoring `future_type` and `promise_type` internals:

1. **Coroutine Frame Allocation**  Compiler-injected code calls `new` to allocate a **coroutine frame** and copy parameters into it. *(Note: `promise_type` can override `new` operator. Default uses global `new`. Overriding `new` typically requires overriding `delete`)*

2. **Promise Object Construction**  Compiler generates code to construct `promise_type` object within the frame.

3. **Return Object Acquisition**  Get `return_object` to store coroutine's "return value". This object will be used after first suspension.

4. **Initial Suspension**  Call `promise.initial_suspend()` to suspend `three_step_coroutine`, preparing to return control to `main`.

5. **Future Object Creation**  Construct `future_type` object and return it to `ret`. Control returns to `main`.

6. **First Resume**  `main` calls `ret.resume()`:  Uses `co_handle_` in `future_type` to resume coroutine，Control transfers from `main` to `three_step_coroutine`

7. **First Coroutine Execution**  Coroutine executes first `std::cout`, then hits `co_await` and suspends itself. Control returns to `main`.

8. **Second Resume**  *(Execution similar to step 6-7, omitted for brevity)*

9. **Final Coroutine Execution**  
   On third `resume()`:  
   - Coroutine executes final `std::cout`  
   - Calls `return_void()` to store "return value" in `return_object` (which is actually `promise` object)

10. **Final Suspension**  
    Call `promise.final_suspend()` to suspend coroutine again. Control returns to `main`.

11. **Cleanup**  
    After `main` ends:  
    - `future` object destroyed  
    - `promise` object destroyed  
    - Program terminates

By analyzing the above code and its execution process, we can conclude the following points:

• The `main` function cannot be a coroutine, meaning `co_await`, `co_return`, and `co_yield` keywords cannot appear in the `main` function (constructors cannot be coroutines either).

• Non-coroutine code (code in the `main` function) can call coroutine code.

• Non-coroutine code can control coroutine execution via the coroutine handle `co_handle`. In this example, non-coroutine code calls the `resume` method exposed by the `future` object, using `co_handle` to control coroutine resumption.

• Before the coroutine executes for the first time, compiler-inserted code will create a `promise` object and call its `get_return_type` method to obtain the `return_object`.

• Then, the `initial_suspend` method is called, which determines whether the coroutine should suspend after initialization or start executing the coroutine body immediately.

• After the coroutine suspends for the first time, a `future` object is created and returned to the caller, transferring execution control back to the caller.

• After the last line of the coroutine body executes, `return_void` or `return_value` is called to store the return value. Then, the `final_suspend` method in `promise` is invoked. If this method suspends the coroutine, control is returned directly to the caller. If it does not suspend the coroutine, once the code inside `final_suspend` completes execution, the coroutine is fully finished, the `promise` object is destroyed, and control is returned to the caller.

From the above conclusions, we can further summarize:

• `future_type`, `promise_type`, and `coroutine_handle` are the core mechanisms of coroutines.

• `promise_type` is a type within `future_type`.

• The design choices for a coroutine (such as the type of value it returns, whether it suspends after initialization, how exceptions are handled, etc.) are conveyed to the compiler via `promise_type`, and the compiler is responsible for instantiating the `promise` object.

• The compiler embeds the coroutine handle (`coroutine_handle`) into the `future` object, thereby exposing control of the coroutine to the caller.

Below is a rough representation of the actual code inserted by the compiler, where `<body>` represents the code inside our `three_step_coroutine`.

~~~cpp
{
  co_await promise.initial_suspend();
  try{
    <body>
  }catch (...){
    promise.unhandled_exception();
  }
  co_await promise.final_suspend();
}
~~~

From the above code, we can see that before the coroutine body is executed, the `initial_suspend` method is called first. If an exception occurs, the `unhandled_exception` method is executed. After execution is complete, the `final_suspend` method is called. Additionally, `promise_type` has multiple interfaces that are not reflected in the above code.

Let's take a full look at the interfaces of `promise_type`:

| `promise_type` Interface | Function | Required |
|--|--|--|
| `initial_suspend()` | Determines when the coroutine body starts execution | Yes |
| `final_suspend()` | Determines the behavior after the coroutine body completes execution | Yes |
| `get_return_object()` | Retrieves the holder that stores the coroutine return value | Yes |
| `unhandled_exception()` | Defines how to handle exceptions during coroutine execution | Yes |
| `return_value(T)`, `return_void()` | Defines the behavior of the `co_return xxx;` statement in the coroutine body | No |
| `yield_value()` | Defines the behavior of the `co_yield xxx;` statement in the coroutine body | No |
| `await_transform()` | Defines the behavior of the `co_await xxx;` statement in the coroutine body. When this method is defined, the compiler transforms each `co_await xxx;` appearing in the coroutine body into `co_await promise.await_transform(xxx);` | No |

### `coroutine_handle` Interfaces

The `coroutine_handle` also exposes multiple interfaces for controlling coroutine behavior and retrieving coroutine status. Unlike `promise_type`, whose interfaces must be implemented by the programmer and are called by the compiler, `coroutine_handle` interfaces require no implementation and can be called directly.

| `coroutine_handle` Interface | Function |
|--|--|
| `from_promise()` | Creates a `coroutine_handle` from a `promise` object |
| `done()` | Checks if the coroutine has finished execution |
| `operator bool` | Checks whether the current handle is a valid coroutine |
| `operator()` | Resumes coroutine execution |
| `resume()` | Resumes coroutine execution (same as above) |
| `destroy()` | Destroys the coroutine |
| `promise()` | Retrieves the coroutine's `promise` object |
| `address()` | Returns the pointer to `coroutine_handle` |
| `from_address()` | Imports a `coroutine_handle` from a pointer |

With the above reference list, we can now try to implement a coroutine that returns an `int` value.

(Run environment: [https://godbolt.org/](https://godbolt.org/) - Select compiler version `"x86-64 gcc (coroutines)"`)

~~~cpp
#include<iostream>
#include<coroutine>
using namespace std;

struct future_type_int{
    struct promise_type;
    using co_handle_type = std::coroutine_handle<promise_type>;
    
    struct promise_type{
        int ret_val;
        promise_type(){
            std::cout<<"promise_type constructor"<<std::endl;
        }
        ~promise_type(){
            std::cout<<"promise_type destructor"<<std::endl;
        }
        auto get_return_object(){
            std::cout<<"get_return_object"<<std::endl;
            return co_handle_type::from_promise(*this);
        }
        auto initial_suspend(){
            std::cout<<"initial_suspend"<<std::endl;
            return std::suspend_always();
        }
        auto final_suspend() noexcept(true) {
            std::cout<<"final_suspend"<<std::endl;
            return std::suspend_never();
        }
        void return_value(int val){
            std::cout<<"return_value : "<<val<<std::endl;
            ret_val = val;
        }
        void unhandled_exception(){
            std::cout<<"unhandled_exception"<<std::endl;
            std::terminate();
        }
        auto yield_value(int val){
            std::cout<<"yield_value : "<<val<<std::endl;
            ret_val = val;
            return std::suspend_always();
        }
    };
    future_type_int(co_handle_type co_handle){
        std::cout<<"future_type_int constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_int(){
        std::cout<<"future_type_int destructor"<<std::endl;
        co_handle_.destroy();
    }
    future_type_int(const future_type_int&) = delete;
    future_type_int(future_type_int&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }
    co_handle_type co_handle_;
};

future_type_int three_step_coroutine(){
    std::cout<<"three_step_coroutine begin"<<std::endl;
    co_yield 222;
    std::cout<<"three_step_coroutine running"<<std::endl;
    co_yield 333;
    std::cout<<"three_step_coroutine end"<<std::endl;
    co_return 444;
}
int main(){
    future_type_int future_obj = three_step_coroutine(); 
    
    std::cout<<"=======calling first resume======"<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    
    std::cout<<"=======calling second resume====="<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    
    std::cout<<"=======calling third resume======"<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    std::cout<<"=======main end======"<<std::endl;

    return 0;
}
~~~

**It is worth noting** that `promise_type` is a type name specified by the C++20 standard, whereas `future_type` is not—you can name it anything you like, such as `future_type_int`. As long as it contains a `promise_type` internally, it will compile successfully.

~~~cpp
promise_type constructor
get_return_object
initial_suspend
future_type constructor
=======calling first resume======
three_step_coroutine begin
yield_value : 222
ret_val = 222
=======calling second resume=====
three_step_coroutine running
yield_value : 333
ret_val = 333
=======calling third resume======
three_step_coroutine end
return_value : 444
final_suspend
promise_type destructor
ret_val = 444
=======main end======
future_type destructor
~~~

At this point, we can now answer the previously mentioned "Three Fundamental Questions":

• When a coroutine is suspended, its call stack and related information are stored in the coroutine frame.

• The compiler is responsible for inserting code to create and destroy the coroutine frame, as well as saving and restoring the call stack.

• The return value is passed by the compiler to the `promise` object and stored in one of its members. The caller can obtain the `promise` object via `coroutine_handle`, and thereby access the return value.

Through the previous code example, we have already learned how to design a coroutine and return the desired value. Simply put:

- By implementing `yield_value` and `return_value` in `promise_type`, the coroutine body can return values to the caller using `co_yield` and `co_return`.

But what is the purpose of `co_await`? In the coroutine example that returns an `int` value, we never used the `co_await` keyword from start to finish.

What is the significance of `co_await`?

In the coroutine example without a return value, there is a line inside the `three_step_coroutine` body:

```
co_await std::suspend_always();
```
Why does calling this line of code cause the coroutine to suspend?  
In the coroutine example that returns an `int` value, our method of retrieving the return value is quite unrefined. How can we improve it?  

`co_await` will answer all of these questions.

### co_await、Awaitable and Awaiter  
`co_await` is a unary operator. For the following code:
~~~cpp
co_await xxx;
~~~
`co_await` is an operator, and `xxx` is its operand. Only when `xxx` is of an `Awaitable` type can it be used as an operand for `co_await`.  
For example, `std::suspend_always()` is an `Awaitable` type.

### What Makes a Type `Awaitable`?

• If the `promise` object of the current coroutine implements the `await_transform` method, then any `co_await aaa; co_await bbb;` appearing in the coroutine body will treat `aaa` and `bbb` as `Awaitable`.  
  The statement `co_await xxx;` will be transformed into `co_await promise.await_transform(xxx);` by the compiler.

• If `xxx`'s corresponding `future_type` implements the three methods `await_ready`, `await_suspend`, and `await_resume`, then `xxx` is also `Awaitable`.  
  This is the most common way to implement an `Awaitable` type.  
  `std::suspend_always()` falls into this category.

Only when `xxx` is `Awaitable` is the statement `co_await xxx;` syntactically valid.  
From this, we can see that whether `xxx` is `Awaitable` depends not only on `xxx` itself but also on the `promise_type` implementation of the caller of `co_await xxx;`.  
(Technically, the compiler first checks the `promise_type` of the caller. If `await_transform` is not implemented there, it then checks whether `xxx` implements `await_ready`, `await_suspend`, and `await_resume`.)

A class that implements the three methods `await_ready`, `await_suspend`, and `await_resume` is called an `Awaiter` type.

**An `Awaiter` type is always `Awaitable`.**  
A non-`Awaiter` type **may** be `Awaitable`.

### What Are the Functions of the Three `Awaiter` Interfaces?

Let's first examine how the compiler processes `co_await xxx;` (ignoring exception handling):
~~~cpp
{
	auto a = get_awaiter_object_of_xxx();
	if(!a.await_ready()) {
		<suspend_current_coroutine>
	#if(a.await_suspend returns void)
		a.await_suspend(coroutine_handle);
		return_to_the_caller_of_current_coroutine();
	#elseif(a.await_suspend returns bool)
		bool await_suspend_result = a.await_suspend(coroutine_handle);
		if (await_suspend_result)
			return_to_the_caller_of_current_coroutine();
		else
			goto <resume_current_cocourine>;// This `goto` statement is redundant; it is included to emphasize the execution flow when `await_suspend_result == false`.
	#elseif(a.await_suspend returns another coroutine_handle)
	    auto another_coro_handle = a.await_suspend(coroutine_handle);
		another_coro_handle.resume();
		// According to documentation, after executing `another_coro_handle.resume();`, control can still be returned to the caller of the current coroutine. 
    // However, the author doubts this behavior.
		//https://blog.panicsoftware.com/co_awaiting-coroutines/ 
		return_to_the_caller_of_current_coroutine();
	#endif
		<resume_current_cocourine>
	}
	return a.await_resume();
}
~~~
Similar to `promise_type`, programmers can implement interfaces such as `await_ready` for different scenarios **to define the behavior of `co_await`**.  
It is easier to understand with a real-world example:  

Suppose `xxx` is a coroutine, and we are the authors of this coroutine.  
We want to customize the behavior when others use `co_await xxx`, so we implement the three `Awaitable` interfaces inside the `future_type` of `xxx`.  
When the compiler encounters `co_await xxx;`, it processes it as follows:

• It retrieves the `future` object of `xxx`, then uses this object to obtain the `awaiter` object.  
  (The exact mechanism, represented as the `get_awaiter_object_of_xxx` function, is omitted here.  
  As long as `future_type` implements the three `Awaitable` interfaces, the `awaiter` object can be successfully retrieved.)

• It calls the `await_ready` interface.  
  If the resource that the caller coroutine is awaiting is already ready, or if waiting is unnecessary (i.e., it completes instantly),  
  our `xxx` coroutine can return `true` from this interface.  

  When the compiler sees this `true`, it knows **there is no need to suspend the caller coroutine**.  
  (Although suspending a coroutine is far less costly than suspending a thread, it still has overhead.)  

  As a result, the compiler directly calls `await_resume` and returns its result.  
  The purpose of the `await_ready()` method is to eliminate the cost of `suspend_current_coroutine` when it is known in advance that the operation will complete synchronously without suspension.

**In most cases, the `await_resume` interface returns `false`.** (Like `std::suspend_always()`)

• If the resource that the current coroutine is waiting for is not yet ready in the `xxx` coroutine,  
  the compiler generates code to **suspend the current coroutine**, preparing to transfer control to the `xxx` coroutine.  
  This allows `xxx` to execute and prepare the required resource for the caller.

• After suspending the current coroutine, the compiler calls `a.await_suspend`, passing in **the handle of the current coroutine**.  
  Inside `a.await_suspend`, execution of the `xxx` coroutine can now be resumed.  
  Once `await_suspend` finishes execution, it returns a value, which can be one of four cases:

• **`await_suspend` returns `void`**:  
    Control is returned to **the caller of the current coroutine's caller** (i.e., the caller of `xxx`'s caller).  
    The current coroutine will resume execution from `<resume_current_coroutine>` at some future point,  
    eventually retrieving the return value from `await_resume`.

•  **`await_suspend` returns `true`**:  
    This behaves the same as returning `void`.

• **`await_suspend` returns `false`**:  
    The current coroutine is resumed immediately via `<resume_current_coroutine>`,  
    then `await_resume` is called, and its return value is passed to the current coroutine.  
    Control remains with the current coroutine.

• **`await_suspend` returns a coroutine handle**:  
    The `resume` method of the returned coroutine handle is called, resuming the corresponding coroutine.  
    This resumption can trigger a chain reaction, eventually causing the current coroutine to be resumed.  
    If the returned coroutine handle happens to be the handle of the current coroutine itself,  
    then the current coroutine is resumed directly.

Before calling `await_suspend`, the current coroutine is already fully suspended.  
  Therefore, the coroutine handle can be resumed from **another thread**.  
  However, this more complex scenario is beyond the scope of this discussion.

Simply put, for `co_await xxx;`, the process works as follows:

• `await_ready` implemented by `xxx` informs the caller of `xxx` whether the caller coroutine needs to be suspended.

• `await_resume` implemented by `xxx` is responsible for returning the value produced during the execution of `xxx` to its caller.

• `await_suspend` implemented by `xxx` determines where control should go after `xxx` completes execution (which may include intermediate suspensions).

A bit confusing, isn't it?  
It becomes much clearer with a complete example:
~~~cpp
#include<iostream>
#include<coroutine>
using namespace std;

struct future_type_int{
    struct promise_type{
    int ret_val;
    using co_handle_type = std::coroutine_handle<promise_type>;
    promise_type(){
        std::cout<<"promise_type constructor"<<std::endl;
    }
    ~promise_type(){
        std::cout<<"promise_type destructor"<<std::endl;
    }
    auto get_return_object(){
    	std::cout<<"get_return_object"<<std::endl;
        return co_handle_type::from_promise(*this);
    }
    auto initial_suspend(){
    	std::cout<<"initial_suspend"<<std::endl;
        return std::suspend_always();
    }
    auto final_suspend() noexcept(true) {
    	std::cout<<"final_suspend"<<std::endl;
        return std::suspend_never();
    }
    void return_value(int val){
    	std::cout<<"return_value : "<<val<<std::endl;
        ret_val = val;
	}
    void unhandled_exception(){
    	std::cout<<"unhandled_exception"<<std::endl;
        std::terminate();
    }
    auto yield_value(int val){
        std::cout<<"yield_value : "<<val<<std::endl;
        ret_val = val;
        return std::suspend_always();
    }
};
    using co_handle_type = std::coroutine_handle<promise_type>;
    future_type_int(co_handle_type co_handle){
        std::cout<<"future_type_int constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_int(){
        std::cout<<"future_type_int destructor"<<std::endl;
    }
    future_type_int(const future_type_int&) = delete;
    future_type_int(future_type_int&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }
    bool await_ready() { 
        return false; 
    }
    bool await_suspend(std::coroutine_handle<> handle) {
        resume();
        return false;
    }
    auto await_resume() {
        return co_handle_.promise().ret_val;
    }

    co_handle_type co_handle_;
};

future_type_int three_step_coroutine(){
    std::cout<<"three_step_coroutine begin"<<std::endl;
    co_yield 222;
    std::cout<<"three_step_coroutine running"<<std::endl;
    co_yield 333;
    std::cout<<"three_step_coroutine end"<<std::endl;
    co_return 444;
}

struct future_type_void{
	struct promise_type;
	using co_handle_type = std::coroutine_handle<promise_type>;
	struct promise_type{
	    promise_type(){
	        std::cout<<"promise_type constructor void"<<std::endl;
	    }
	    ~promise_type(){
	        std::cout<<"promise_type destructor void"<<std::endl;
	    }
	    auto get_return_object(){
	    	std::cout<<"get_return_object void"<<std::endl;
	        return co_handle_type::from_promise(*this);
	    }
	    auto initial_suspend(){
	    	std::cout<<"initial_suspend void"<<std::endl;
	        return std::suspend_always();
	    }
	    auto final_suspend() noexcept(true) {
	    	std::cout<<"final_suspend void"<<std::endl;
	        return std::suspend_never();
	    }
	    void unhandled_exception(){
	    	std::cout<<"unhandled_exception void"<<std::endl;
	        std::terminate();
	    }
	    void return_void(){
	    	std::cout<<"return_void void: "<<std::endl;
		}
	};

    future_type_void(co_handle_type co_handle){
        std::cout<<"future_type_void constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_void(){
        std::cout<<"future_type_void destructor"<<std::endl;
        co_handle_.destroy();
    }
    future_type_void(const future_type_void&) = delete;
    future_type_void(future_type_void&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }

    co_handle_type co_handle_;
};
future_type_void call_coroutine(){
    auto future = three_step_coroutine();
    std::cout<<"++++++++call three_step_coroutine first++++++++"<<std::endl;
    auto val = co_await future;
    std::cout<<"++++++++call three_step_coroutine second++++++++, val: "<<val<<std::endl;
    val = co_await future; 
    std::cout<<"++++++++call three_step_coroutine third++++++++, val: "<<val<<std::endl;
    val = co_await future; 
    std::cout<<"++++++++call three_step_coroutine end++++++++, val: "<<val<<std::endl;
    co_return;
}
int main(){
    auto ret = call_coroutine();
    std::cout<<"++++++++begine call_coroutine resume in main++++++++"<<std::endl;
    ret.resume();
    std::cout<<"++++++++end call_coroutine resume in main++++++++"<<std::endl;
    return 0;
}
~~~

Output:
~~~cpp
promise_type constructor void
get_return_object void
initial_suspend void
future_type_void constructor
++++++++begine call_coroutine resume in main++++++++
promise_type constructor
get_return_object
initial_suspend
future_type_int constructor
++++++++call three_step_coroutine first++++++++
three_step_coroutine begin
yield_value : 222
++++++++call three_step_coroutine second++++++++, val: 222
three_step_coroutine running
yield_value : 333
++++++++call three_step_coroutine third++++++++, val: 333
three_step_coroutine end
return_value : 444
final_suspend
promise_type destructor
++++++++call three_step_coroutine end++++++++, val: 444
return_void void: 
future_type_int destructor
final_suspend void
promise_type destructor void
++++++++end call_coroutine resume in main++++++++
future_type_void destructor
~~~

We can see that each time `co_await future;` is called, it returns a value from a `co_yield` statement inside `three_step_coroutine`.  

In `future_type_int`, we implemented the `await_suspend` method to return `false`, ensuring that after `co_await future;`, control returns to the `call_coroutine` coroutine instead of the `main` function.  

You can try changing the return value of `await_suspend` to better understand how this return value affects the behavior of `co_await`.  

At this point, you should also understand why `co_await std::suspend_always()` suspends the current coroutine—because `suspend_always` is implemented as follows:
~~~cpp
constexpr bool await_ready() const noexcept { return false; }
constexpr void await_suspend(std::coroutine_handle<>) const noexcept {}
constexpr void await_resume() const noexcept {}
~~~
`await_ready` returning `false` ensures that the current coroutine will be suspended,  
while `await_suspend` returning `void` ensures that after the coroutine is suspended,  
control is returned to the caller of the current coroutine.  
That's all there is to it.

### Personal Thoughts on Coroutine Issues:
1. The semantics of `co_await` are inconsistent—it can mean either "invoke & await" or "invoke & suspend,"  
   depending on the coroutine library implementation, which creates readability challenges in code.

This concludes the discussion on coroutines in C++20.  
When learning C++ coroutines, many concepts require careful consideration,  
such as the relationship between `Awaiter` and `Awaitable`.  
Researching compiler-inserted code for coroutines can help deepen understanding of these concepts.  

Due to limited knowledge, there may be omissions in this article.  
Readers are welcome to reach out for discussion and feedback.

### References:
https://blog.panicsoftware.com/co_awaiting-coroutines
https://en.cppreference.com/w/cpp/language/coroutines
https://lewissbaker.github.io/2018/09/05/understanding-the-promise-type
https://lewissbaker.github.io/2017/11/17/understanding-operator-co-await